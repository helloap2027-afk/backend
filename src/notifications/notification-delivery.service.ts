import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import * as crypto from "node:crypto";

export type NotificationChannel = "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
export type NotificationCategory = "QUOTES" | "LEADS" | "KYC" | "OFFERS" | "SECURITY" | "REVIEWS" | "SYSTEM";
export type OutboxStatus = "QUEUED" | "PROCESSING" | "SENT" | "DELIVERED" | "FAILED" | "RETRYING";

export interface NotificationPreferenceSetting {
  channel: NotificationChannel;
  category: NotificationCategory;
  isEnabled: boolean;
}

export interface UserPreferencesDto {
  userId: string;
  role: "CUSTOMER" | "VENDOR_OWNER";
  preferences: NotificationPreferenceSetting[];
}

export interface QueueNotificationInput {
  idempotencyKey: string;
  eventType: string;
  recipientId?: string;
  recipientRole: "CUSTOMER" | "VENDOR_OWNER" | "SUPER_ADMIN";
  recipientPhone?: string;
  recipientEmail?: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  title: string;
  message: string;
  payload?: any;
}

@Injectable()
export class NotificationDeliveryService implements OnModuleInit {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private workerInterval: NodeJS.Timeout | null = null;

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    this.ensureTables();
    this.startOutboxWorker();
  }

  private ensureTables() {
    try {
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS user_notification_preferences (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'CUSTOMER',
          channel TEXT NOT NULL,
          category TEXT NOT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(user_id, role, channel, category)
        );
      `);
      this.db.execute(`
        CREATE TABLE IF NOT EXISTS notification_outbox (
          id TEXT PRIMARY KEY,
          idempotency_key TEXT UNIQUE NOT NULL,
          event_type TEXT NOT NULL,
          recipient_id TEXT,
          recipient_role TEXT NOT NULL DEFAULT 'CUSTOMER',
          recipient_phone TEXT,
          recipient_email TEXT,
          channel TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          payload TEXT,
          status TEXT NOT NULL DEFAULT 'QUEUED',
          provider TEXT DEFAULT 'INTERNAL_SIMULATION',
          provider_ref TEXT,
          retry_count INTEGER NOT NULL DEFAULT 0,
          max_retries INTEGER NOT NULL DEFAULT 3,
          last_error TEXT,
          next_retry_at TEXT,
          sent_at TEXT,
          delivered_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    } catch (e: any) {
      this.logger.warn(`ensureTables notice: ${e.message}`);
    }
  }

  /**
   * Default preference matrix
   * Note: SECURITY is strictly non-opt-outable (DPDP 2023 compliance).
   */
  getDefaultPreferences(role: "CUSTOMER" | "VENDOR_OWNER"): NotificationPreferenceSetting[] {
    const channels: NotificationChannel[] = ["IN_APP", "SMS", "WHATSAPP", "EMAIL", "PUSH"];

    if (role === "CUSTOMER") {
      const categories: NotificationCategory[] = ["QUOTES", "OFFERS", "SECURITY", "SYSTEM"];
      const prefs: NotificationPreferenceSetting[] = [];
      for (const cat of categories) {
        for (const ch of channels) {
          // By default, essential alerts enabled; promotional SMS/Email opt-in defaults
          const isEnabled = cat === "SECURITY" || cat === "QUOTES" || ch === "IN_APP" || ch === "PUSH";
          prefs.push({ channel: ch, category: cat, isEnabled });
        }
      }
      return prefs;
    } else {
      const categories: NotificationCategory[] = ["LEADS", "KYC", "REVIEWS", "SECURITY", "SYSTEM"];
      const prefs: NotificationPreferenceSetting[] = [];
      for (const cat of categories) {
        for (const ch of channels) {
          // Partner default is heavily active across leads & KYC
          const isEnabled = cat === "SECURITY" || cat === "LEADS" || cat === "KYC" || ch === "IN_APP" || ch === "PUSH";
          prefs.push({ channel: ch, category: cat, isEnabled });
        }
      }
      return prefs;
    }
  }

  /**
   * Get effective notification preferences for user + role
   */
  getUserPreferences(userId: string, role: "CUSTOMER" | "VENDOR_OWNER") {
    const defaults = this.getDefaultPreferences(role);
    const stored = this.db.query<any>(
      `SELECT channel, category, is_enabled FROM user_notification_preferences WHERE user_id = ? AND role = ?`,
      [userId, role]
    );

    const storedMap = new Map<string, boolean>();
    stored.forEach((s) => storedMap.set(`${s.channel}_${s.category}`, s.is_enabled === 1));

    const effective = defaults.map((item) => {
      const key = `${item.channel}_${item.category}`;
      if (item.category === "SECURITY") {
        // Lawful basis: Security notices cannot be silenced
        return { ...item, isEnabled: true };
      }
      return {
        channel: item.channel,
        category: item.category,
        isEnabled: storedMap.has(key) ? storedMap.get(key)! : item.isEnabled,
      };
    });

    return {
      userId,
      role,
      preferences: effective,
    };
  }

  /**
   * Save or update notification preferences for user + role
   */
  updateUserPreferences(userId: string, role: "CUSTOMER" | "VENDOR_OWNER", preferences: NotificationPreferenceSetting[]) {
    const now = new Date().toISOString();

    for (const pref of preferences) {
      if (pref.category === "SECURITY") {
        // DPDP statutory compliance: Security & authentication cannot be turned off
        continue;
      }
      const existing = this.db.queryOne<any>(
        `SELECT id FROM user_notification_preferences WHERE user_id = ? AND role = ? AND channel = ? AND category = ?`,
        [userId, role, pref.channel, pref.category]
      );

      const isEnabledInt = pref.isEnabled ? 1 : 0;
      if (existing) {
        this.db.execute(
          `UPDATE user_notification_preferences SET is_enabled = ?, updated_at = ? WHERE id = ?`,
          [isEnabledInt, now, existing.id]
        );
      } else {
        const id = `unp_${crypto.randomUUID().slice(0, 10)}`;
        this.db.execute(
          `INSERT INTO user_notification_preferences (id, user_id, role, channel, category, is_enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, userId, role, pref.channel, pref.category, isEnabledInt, now, now]
        );
      }
    }

    return this.getUserPreferences(userId, role);
  }

  /**
   * Check if recipient has enabled the given channel + category
   */
  isDeliveryPermitted(userId: string | undefined, role: "CUSTOMER" | "VENDOR_OWNER", channel: NotificationChannel, category: NotificationCategory): boolean {
    if (category === "SECURITY") return true; // Mandatory
    if (!userId) return true; // Fallback to allowed

    const stored = this.db.queryOne<any>(
      `SELECT is_enabled FROM user_notification_preferences WHERE user_id = ? AND role = ? AND channel = ? AND category = ?`,
      [userId, role, channel, category]
    );

    if (stored) {
      return stored.is_enabled === 1;
    }
    // Check system default
    const defaults = this.getDefaultPreferences(role);
    const match = defaults.find((d) => d.channel === channel && d.category === category);
    return match ? match.isEnabled : true;
  }

  /**
   * Enqueue a durable delivery task into the outbox queue
   * Enforces strict idempotency — duplicate keys will NOT duplicate notifications.
   */
  enqueueNotification(input: QueueNotificationInput) {
    const now = new Date().toISOString();

    // Check idempotency
    const existing = this.db.queryOne<any>(
      `SELECT id, status, retry_count, sent_at FROM notification_outbox WHERE idempotency_key = ?`,
      [input.idempotencyKey]
    );

    if (existing) {
      this.logger.log(`[Outbox] Duplicate event detected for key: ${input.idempotencyKey}. Re-using record: ${existing.id}`);
      return {
        queued: false,
        duplicate: true,
        recordId: existing.id,
        status: existing.status,
      };
    }

    // Check preference suppression (skip non-IN_APP if recipient opted out)
    if (input.recipientRole !== "SUPER_ADMIN" && input.channel !== "IN_APP") {
      const allowed = this.isDeliveryPermitted(input.recipientId, input.recipientRole as any, input.channel, input.category);
      if (!allowed) {
        this.logger.log(`[Outbox] Notification suppressed by user preference: ${input.recipientId} / ${input.channel} / ${input.category}`);
        return {
          queued: false,
          suppressedByPreference: true,
          status: "OPTED_OUT",
        };
      }
    }

    const outboxId = `outbox_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const payloadStr = input.payload ? (typeof input.payload === "string" ? input.payload : JSON.stringify(input.payload)) : null;

    this.db.execute(
      `INSERT INTO notification_outbox (
        id, idempotency_key, event_type, recipient_id, recipient_role, recipient_phone,
        recipient_email, channel, category, title, message, payload, status,
        provider, retry_count, max_retries, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', 'INTERNAL_SIMULATION', 0, 3, ?, ?)`,
      [
        outboxId,
        input.idempotencyKey,
        input.eventType,
        input.recipientId || null,
        input.recipientRole,
        input.recipientPhone || null,
        input.recipientEmail || null,
        input.channel,
        input.category,
        input.title,
        input.message,
        payloadStr,
        now,
        now,
      ]
    );

    // If channel is IN_APP, write synchronously into the existing notifications table for instant UI visibility
    if (input.channel === "IN_APP") {
      const notifId = `notif_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
      const recipientField = input.recipientPhone || input.recipientId || (input.recipientRole === "VENDOR_OWNER" ? "MERCHANT" : input.recipientRole);
      
      // Map category to existing notification types
      let notifType = "SYSTEM_ALERT";
      if (input.category === "QUOTES") notifType = "QUOTE_RECEIVED";
      else if (input.category === "LEADS") notifType = "LEAD_RECEIVED";
      else if (input.category === "KYC") notifType = "KYC_VERIFICATION";
      else if (input.category === "OFFERS") notifType = "OFFER_ALERT";
      else if (input.category === "REVIEWS") notifType = "REVIEW_RECEIVED";

      try {
        this.db.execute(
          `INSERT INTO notifications (id, title, message, type, recipient, is_read, related_entity, related_id, created_at)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
          [
            notifId,
            input.title,
            input.message,
            notifType,
            recipientField,
            input.eventType.toLowerCase(),
            input.idempotencyKey,
            now,
          ]
        );
      } catch (e: any) {
        this.logger.warn(`Failed to insert linked in-app notification: ${e.message}`);
      }
    }

    return {
      queued: true,
      duplicate: false,
      recordId: outboxId,
      status: "QUEUED",
    };
  }

  /**
   * Process a single outbox entry with mock provider simulation
   * CRITICAL SAFEGUARD:
   * "Important: Do not mark SMS, WhatsApp, email, or push notifications as delivered
   * unless the respective provider confirms delivery. Local simulated delivery must remain clearly identified as testing."
   */
  async processOutboxItem(item: any): Promise<{ success: boolean; status: OutboxStatus; error?: string }> {
    const now = new Date().toISOString();

    // Mark as PROCESSING
    this.db.execute(`UPDATE notification_outbox SET status = 'PROCESSING', updated_at = ? WHERE id = ?`, [now, item.id]);

    try {
      if (item.channel === "IN_APP") {
        // In-App is internal to our database, immediately DELIVERED
        this.db.execute(
          `UPDATE notification_outbox 
           SET status = 'DELIVERED', provider = 'INTERNAL_DB', provider_ref = ?, sent_at = ?, delivered_at = ?, updated_at = ?
           WHERE id = ?`,
          [`inapp_${Date.now()}`, now, now, now, item.id]
        );
        return { success: true, status: "DELIVERED" };
      }

      // Channels: SMS, WHATSAPP, EMAIL, PUSH
      // We send via local simulation provider.
      // We mark status as SENT (SIMULATION_SENT), NOT DELIVERED, because real provider webhook has not confirmed delivery!
      const simulationRef = `sim_${item.channel.toLowerCase()}_${Date.now()}`;
      
      this.logger.log(`[Outbox Worker] [SIMULATION] Dispatching ${item.channel} to ${item.recipient_phone || item.recipient_email || item.recipient_id}: "${item.title}"`);

      this.db.execute(
        `UPDATE notification_outbox 
         SET status = 'SENT', provider = 'LOCAL_DEV_SIMULATOR', provider_ref = ?, sent_at = ?, updated_at = ?
         WHERE id = ?`,
        [simulationRef, now, now, item.id]
      );

      // Also log into normal_push_logs for Super Admin visibility if channel was PUSH or SMS
      try {
        this.db.execute(
          `INSERT OR IGNORE INTO normal_push_logs (
            id, notification_ref, event_type, recipient_type, recipient_id, recipient_phone,
            title, message, destination_url, delivery_status, error_reason, created_at, sent_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SENT (DEV_SIMULATION)', NULL, ?, ?)`,
          [
            `log_${Date.now()}_${crypto.randomUUID().slice(0, 4)}`,
            simulationRef,
            item.event_type,
            item.recipient_role,
            item.recipient_id,
            item.recipient_phone,
            item.title,
            item.message,
            "/notifications",
            now,
            now,
          ]
        );
      } catch {}

      return { success: true, status: "SENT" };
    } catch (err: any) {
      const errorMsg = err?.message || "Delivery provider transmission failed";
      const newRetryCount = (item.retry_count || 0) + 1;
      const maxRetries = item.max_retries || 3;

      if (newRetryCount >= maxRetries) {
        // Permanently FAILED
        this.db.execute(
          `UPDATE notification_outbox 
           SET status = 'FAILED', retry_count = ?, last_error = ?, updated_at = ? 
           WHERE id = ?`,
          [newRetryCount, errorMsg, now, item.id]
        );
        return { success: false, status: "FAILED", error: errorMsg };
      } else {
        // Exponential backoff: 30s * (2 ^ retry_count)
        const delayMs = 30000 * Math.pow(2, newRetryCount);
        const nextRetry = new Date(Date.now() + delayMs).toISOString();

        this.db.execute(
          `UPDATE notification_outbox 
           SET status = 'RETRYING', retry_count = ?, last_error = ?, next_retry_at = ?, updated_at = ? 
           WHERE id = ?`,
          [newRetryCount, errorMsg, nextRetry, now, item.id]
        );
        return { success: false, status: "RETRYING", error: errorMsg };
      }
    }
  }

  /**
   * Process all pending items in the outbox
   */
  async processPendingOutbox(limit: number = 20) {
    const now = new Date().toISOString();
    const pendingItems = this.db.query<any>(
      `SELECT * FROM notification_outbox 
       WHERE (status = 'QUEUED') 
          OR (status = 'RETRYING' AND (next_retry_at IS NULL OR next_retry_at <= ?))
       ORDER BY created_at ASC 
       LIMIT ?`,
      [now, limit]
    );

    let processed = 0;
    for (const item of pendingItems) {
      await this.processOutboxItem(item);
      processed++;
    }

    return { processed, totalPending: pendingItems.length };
  }

  /**
   * Trigger immediate retry for a failed or retrying outbox item (Admin Action)
   */
  async retryOutboxItem(id: string) {
    const item = this.db.queryOne<any>(`SELECT * FROM notification_outbox WHERE id = ?`, [id]);
    if (!item) {
      throw new NotFoundException(`Outbox item '${id}' not found`);
    }
    return this.processOutboxItem(item);
  }

  /**
   * Super Admin Outbox query with status, channel, and search filtering
   */
  getOutboxLogs(query: {
    status?: string;
    channel?: string;
    role?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (query.status && query.status !== "ALL") {
      whereClauses.push("status = ?");
      params.push(query.status);
    }

    if (query.channel && query.channel !== "ALL") {
      whereClauses.push("channel = ?");
      params.push(query.channel);
    }

    if (query.role && query.role !== "ALL") {
      whereClauses.push("recipient_role = ?");
      params.push(query.role);
    }

    if (query.search && query.search.trim()) {
      const q = `%${query.search.trim()}%`;
      whereClauses.push("(title LIKE ? OR message LIKE ? OR recipient_phone LIKE ? OR idempotency_key LIKE ?)");
      params.push(q, q, q, q);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countRow = this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM notification_outbox ${whereSql}`,
      params
    );
    const totalRecords = countRow?.total || 0;
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;

    const records = this.db.query<any>(
      `SELECT * FROM notification_outbox ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // Queue summary breakdown
    const stats = {
      queued: (this.db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM notification_outbox WHERE status = 'QUEUED'") || { count: 0 }).count,
      sent: (this.db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM notification_outbox WHERE status = 'SENT'") || { count: 0 }).count,
      delivered: (this.db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM notification_outbox WHERE status = 'DELIVERED'") || { count: 0 }).count,
      failed: (this.db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM notification_outbox WHERE status = 'FAILED'") || { count: 0 }).count,
      retrying: (this.db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM notification_outbox WHERE status = 'RETRYING'") || { count: 0 }).count,
      total: totalRecords,
    };

    return {
      data: records,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages,
      },
      stats,
    };
  }

  /**
   * Start recurring worker interval to drain outbox
   */
  private startOutboxWorker() {
    if (this.workerInterval) return;
    this.workerInterval = setInterval(async () => {
      try {
        await this.processPendingOutbox(15);
      } catch (err) {
        this.logger.error("Error in outbox background loop:", err);
      }
    }, 10000); // Check every 10 seconds
  }
}

