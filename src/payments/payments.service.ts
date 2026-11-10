import { 
  Injectable, 
  BadRequestException, 
  NotFoundException, 
  ConflictException,
  UnauthorizedException 
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { WalletLedgerService } from "../wallet/wallet-ledger.service";
import * as crypto from "node:crypto";

export interface CreateOrderInput {
  userId: string;
  userType: "CUSTOMER" | "MERCHANT";
  purpose: "WALLET_TOPUP" | "SUBSCRIPTION_PLAN" | "LEAD_PURCHASE" | "BOOKING";
  amountRupees: number;
  currency?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  transaction_ref: string;
  payer_id: string;
  payer_type: "CUSTOMER" | "MERCHANT";
  payer_name: string;
  payer_email?: string;
  payer_phone?: string;
  purpose: string;
  amount: number;
  amount_paise: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED";
  failure_reason?: string;
  payment_method?: string;
  gateway_ref?: string;
  idempotency_key: string;
  metadata_json?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

@Injectable()
export class PaymentsService {
  private readonly webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || "hello_hi_payment_webhook_secret_key_2026";

  constructor(
    private readonly db: DatabaseService,
    private readonly walletService: WalletLedgerService
  ) {
    this.ensureTables();
  }

  private ensureTables() {
    try {
      this.db.getRawDb().exec(`
        CREATE TABLE IF NOT EXISTS payment_orders (
          id TEXT PRIMARY KEY,
          order_id TEXT UNIQUE NOT NULL,
          user_id TEXT NOT NULL,
          user_type TEXT NOT NULL,
          purpose TEXT NOT NULL,
          amount REAL NOT NULL,
          amount_paise INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          status TEXT NOT NULL DEFAULT 'PENDING',
          failure_reason TEXT,
          payment_method TEXT,
          gateway_ref TEXT,
          idempotency_key TEXT UNIQUE NOT NULL,
          metadata_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_po_user ON payment_orders(user_id, user_type);
        CREATE INDEX IF NOT EXISTS idx_po_status ON payment_orders(status);
        CREATE INDEX IF NOT EXISTS idx_po_idemp ON payment_orders(idempotency_key);
        CREATE INDEX IF NOT EXISTS idx_po_order_id ON payment_orders(order_id);

        CREATE TABLE IF NOT EXISTS payment_webhook_events (
          id TEXT PRIMARY KEY,
          event_id TEXT UNIQUE NOT NULL,
          event_type TEXT NOT NULL,
          order_id TEXT,
          payload_json TEXT NOT NULL,
          signature TEXT,
          status TEXT NOT NULL DEFAULT 'PROCESSED',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_pwe_event ON payment_webhook_events(event_id);
      `);
    } catch (e: any) {
      console.warn("[PaymentsService] ensureTables:", e?.message);
    }
  }

  /**
   * Safe conversion of Rupees to integer paise
   */
  public toPaise(rupees: number): number {
    return Math.round(Number(rupees) * 100);
  }

  /**
   * Create an authoritative payment order with mandatory idempotency key
   */
  public createOrder(input: CreateOrderInput) {
    if (!input.amountRupees || input.amountRupees <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }
    if (!input.idempotencyKey || !input.idempotencyKey.trim()) {
      throw new BadRequestException("Mandatory idempotencyKey is required for payment initiation");
    }

    const idempotencyKey = input.idempotencyKey.trim();

    // 1. Idempotency Check: Return existing order if key matches
    const existing = this.db.queryOne<any>(
      "SELECT * FROM payment_orders WHERE idempotency_key = ?",
      [idempotencyKey]
    );

    if (existing) {
      return {
        isDuplicate: true,
        orderId: existing.order_id,
        amount: existing.amount,
        amountPaise: existing.amount_paise,
        currency: existing.currency,
        status: existing.status,
        purpose: existing.purpose,
        createdAt: existing.created_at,
        metadata: existing.metadata_json ? JSON.parse(existing.metadata_json) : null,
      };
    }

    // 2. Fetch User Info
    const user = this.db.queryOne<any>("SELECT full_name, email, phone_number FROM users WHERE id = ?", [input.userId]);
    const payerName = input.payerName || user?.full_name || "HELLO-Hi User";
    const payerEmail = input.payerEmail || user?.email || "";
    const payerPhone = input.payerPhone || user?.phone_number || "";

    const amountPaise = this.toPaise(input.amountRupees);
    const orderId = `order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const id = `pay_ord_${crypto.randomUUID().replace(/-/g, "")}`;
    const now = new Date().toISOString();
    const metadataStr = input.metadata ? JSON.stringify(input.metadata) : null;

    this.db.execute(`
      INSERT INTO payment_orders (
        id, order_id, user_id, user_type, purpose, amount, amount_paise, currency,
        status, idempotency_key, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
    `, [
      id,
      orderId,
      input.userId,
      input.userType,
      input.purpose,
      input.amountRupees,
      amountPaise,
      input.currency || "INR",
      idempotencyKey,
      metadataStr,
      now,
      now
    ]);

    // Also register in main payments ledger table as PENDING
    try {
      this.db.execute(`
        INSERT INTO payments (
          id, transaction_ref, payer_name, payer_email, payer_type, amount, currency,
          payment_method, status, gateway_ref, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ONLINE_GATEWAY', 'PENDING', ?, ?, ?, ?)
      `, [
        id,
        orderId,
        payerName,
        payerEmail,
        input.userType,
        input.amountRupees,
        input.currency || "INR",
        orderId,
        `Payment for ${input.purpose.replace(/_/g, " ")} (${orderId})`,
        now,
        now
      ]);
    } catch {}

    return {
      isDuplicate: false,
      orderId,
      amount: input.amountRupees,
      amountPaise,
      currency: input.currency || "INR",
      status: "PENDING",
      purpose: input.purpose,
      payerName,
      payerEmail,
      payerPhone,
      createdAt: now,
    };
  }

  /**
   * Get real-time status of an order
   */
  public getOrderStatus(orderId: string, userId?: string) {
    const order = this.db.queryOne<any>("SELECT * FROM payment_orders WHERE order_id = ?", [orderId]);
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found.`);
    }

    if (userId && order.user_id !== userId) {
      throw new UnauthorizedException("Unauthorized: You do not own this payment order.");
    }

    return {
      orderId: order.order_id,
      userId: order.user_id,
      userType: order.user_type,
      purpose: order.purpose,
      amount: order.amount,
      amountPaise: order.amount_paise,
      currency: order.currency,
      status: order.status,
      failureReason: order.failure_reason,
      paymentMethod: order.payment_method,
      gatewayRef: order.gateway_ref,
      createdAt: order.created_at,
      updated_at: order.updated_at,
      completedAt: order.completed_at,
      metadata: order.metadata_json ? JSON.parse(order.metadata_json) : null,
    };
  }

  /**
   * Verify HMAC-SHA256 signature for webhooks
   */
  public verifySignature(payload: string, signature: string): boolean {
    if (!signature) return false;
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  /**
   * Secure Webhook Handler with idempotency & race-condition mitigation
   */
  public processWebhook(rawPayload: string, signature: string, eventData: any) {
    // 1. Validate signature in production or if signature supplied
    if (signature) {
      const isValid = this.verifySignature(rawPayload, signature);
      if (!isValid && process.env.NODE_ENV === "production") {
        throw new UnauthorizedException("Invalid webhook cryptographic signature.");
      }
    }

    const eventId = eventData.eventId || eventData.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const eventType = eventData.event || eventData.eventType || "payment.captured";
    const orderId = eventData.orderId || eventData.order_id || eventData.payload?.payment?.entity?.order_id;

    // 2. Event Deduplication Guard
    const existingEvent = this.db.queryOne<any>(
      "SELECT * FROM payment_webhook_events WHERE event_id = ?",
      [eventId]
    );
    if (existingEvent) {
      return { status: "ALREADY_PROCESSED", eventId, orderId };
    }

    const now = new Date().toISOString();

    // 3. Atomically record event and process financial effect
    return this.db.transaction(() => {
      this.db.execute(`
        INSERT INTO payment_webhook_events (id, event_id, event_type, order_id, payload_json, signature, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'PROCESSED', ?)
      `, [
        `pwe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        eventId,
        eventType,
        orderId || null,
        typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload),
        signature || null,
        now
      ]);

      if (!orderId) {
        return { status: "IGNORED_NO_ORDER", eventId };
      }

      const order = this.db.queryOne<any>("SELECT * FROM payment_orders WHERE order_id = ?", [orderId]);
      if (!order) {
        return { status: "ORDER_NOT_FOUND", orderId, eventId };
      }

      // If already settled, do not re-settle (Race condition protection)
      if (order.status === "COMPLETED") {
        return { status: "ALREADY_COMPLETED", orderId };
      }

      if (eventType === "payment.captured" || eventType === "payment.success" || eventType === "PAYMENT_SUCCESS") {
        const gatewayRef = eventData.gatewayRef || eventData.paymentId || `gtw_${Date.now()}`;
        const paymentMethod = eventData.paymentMethod || "UPI";

        // Mark order completed
        this.db.execute(`
          UPDATE payment_orders
          SET status = 'COMPLETED', gateway_ref = ?, payment_method = ?, completed_at = ?, updated_at = ?
          WHERE order_id = ?
        `, [gatewayRef, paymentMethod, now, now, orderId]);

        // Update payments table
        this.db.execute(`
          UPDATE payments
          SET status = 'COMPLETED', gateway_ref = ?, payment_method = ?, updated_at = ?
          WHERE transaction_ref = ?
        `, [gatewayRef, paymentMethod, now, orderId]);

        // Dispatch Business Fulfillment based on purpose
        const meta = order.metadata_json ? JSON.parse(order.metadata_json) : {};

        if (order.purpose === "WALLET_TOPUP") {
          this.walletService.creditWallet({
            userId: order.user_id,
            userType: order.user_type,
            amount: order.amount,
            category: "TOPUP",
            reason: `Online Wallet Top-up (Ref: ${orderId})`,
            adminId: "ONLINE_GATEWAY",
            adminRemarks: `Payment Gateway Ref: ${gatewayRef}`,
            idempotencyKey: `topup_success_${orderId}`,
            externalRef: orderId,
            businessId: meta.businessId || undefined,
          });
        } else if (order.purpose === "SUBSCRIPTION_PLAN") {
          // Fulfill subscription
          const planId = meta.planId;
          const billingInterval = meta.billingInterval || "MONTHLY";
          if (planId) {
            const plan = this.db.queryOne<any>("SELECT * FROM subscription_plans WHERE id = ?", [planId]);
            if (plan) {
              const subId = `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
              const expiry = new Date();
              if (billingInterval === "YEARLY") expiry.setFullYear(expiry.getFullYear() + 1);
              else expiry.setMonth(expiry.getMonth() + 1);

              const user = this.db.queryOne<any>("SELECT full_name, email, phone_number FROM users WHERE id = ?", [order.user_id]);

              this.db.execute(`
                INSERT INTO subscriptions (
                  id, subscriber_name, subscriber_email, subscriber_phone, plan_id, plan_name,
                  status, amount, currency, start_date, expiry_date, auto_renew, payment_status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, 'INR', ?, ?, 1, 'PAID', ?, ?)
              `, [
                subId,
                user?.full_name || "Valued Subscriber",
                user?.email || "",
                user?.phone_number || "",
                plan.id,
                plan.name,
                order.amount,
                now,
                expiry.toISOString(),
                now,
                now
              ]);
            }
          }
        }

        // Outbox notification for Payment Success
        this.emitPaymentNotification(order, "PAYMENT_SUCCESS", {
          orderId,
          amount: order.amount.toFixed(2),
          gatewayRef,
          purpose: order.purpose,
        });

        return { status: "FULFILLED", orderId, eventId };
      } else if (eventType === "payment.failed" || eventType === "PAYMENT_FAILED") {
        const reason = eventData.reason || eventData.errorDescription || "Card declined or bank timeout.";
        this.db.execute(`
          UPDATE payment_orders
          SET status = 'FAILED', failure_reason = ?, updated_at = ?
          WHERE order_id = ?
        `, [reason, now, orderId]);

        this.db.execute(`
          UPDATE payments
          SET status = 'FAILED', description = ?, updated_at = ?
          WHERE transaction_ref = ?
        `, [`Failed: ${reason}`, now, orderId]);

        this.emitPaymentNotification(order, "PAYMENT_FAILED", {
          orderId,
          amount: order.amount.toFixed(2),
          reason,
          purpose: order.purpose,
        });

        return { status: "MARKED_FAILED", orderId, reason };
      } else if (eventType === "payment.cancelled" || eventType === "PAYMENT_CANCELLED") {
        this.db.execute(`
          UPDATE payment_orders
          SET status = 'CANCELLED', failure_reason = 'Cancelled by user at gateway', updated_at = ?
          WHERE order_id = ?
        `, [now, orderId]);

        this.db.execute(`
          UPDATE payments
          SET status = 'FAILED', description = 'Cancelled by user', updated_at = ?
          WHERE transaction_ref = ?
        `, [now, orderId]);

        return { status: "CANCELLED", orderId };
      }

      return { status: "UNHANDLED_EVENT", eventType };
    });
  }

  private emitPaymentNotification(order: any, eventType: "PAYMENT_SUCCESS" | "PAYMENT_FAILED", vars: Record<string, any>) {
    try {
      const user = this.db.queryOne<any>("SELECT full_name, phone_number, email FROM users WHERE id = ?", [order.user_id]);
      const isSuccess = eventType === "PAYMENT_SUCCESS";
      const title = isSuccess ? "Payment Successful" : "Payment Failed";
      const message = isSuccess
        ? `Your payment of ₹${vars.amount} for ${order.purpose.replace(/_/g, " ")} was successful. Reference: ${vars.orderId}`
        : `Your payment of ₹${vars.amount} for ${order.purpose.replace(/_/g, " ")} could not be processed. ${vars.reason || ""}`;

      this.db.execute(`
        INSERT INTO notifications (id, title, message, type, recipient, is_read, related_entity, related_id, created_at)
        VALUES (?, ?, ?, 'FINANCIAL', ?, 0, 'payment_orders', ?, ?)
      `, [
        `notif_pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        message,
        order.user_type === "MERCHANT" ? "MERCHANT" : order.user_id,
        order.order_id,
        new Date().toISOString()
      ]);
    } catch {}
  }

  /**
   * Official Provider Sandbox Simulator (For test runs without interactive mock)
   */
  public simulateGatewaySandboxResponse(orderId: string, action: "SUCCESS" | "FAIL" | "TIMEOUT" | "CANCEL", failureReason?: string) {
    const order = this.db.queryOne<any>("SELECT * FROM payment_orders WHERE order_id = ?", [orderId]);
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found.`);
    }

    if (order.status === "COMPLETED") {
      throw new ConflictException("Order is already completed.");
    }

    const eventId = `sbx_evt_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;

    if (action === "SUCCESS") {
      return this.processWebhook(JSON.stringify({ event: "payment.captured", orderId }), "", {
        eventId,
        event: "payment.captured",
        orderId,
        paymentId: `pay_sbx_${Date.now()}`,
        paymentMethod: "UPI_SANDBOX",
      });
    } else if (action === "FAIL") {
      return this.processWebhook(JSON.stringify({ event: "payment.failed", orderId }), "", {
        eventId,
        event: "payment.failed",
        orderId,
        reason: failureReason || "Issuer bank network error or card decline.",
      });
    } else if (action === "CANCEL") {
      return this.processWebhook(JSON.stringify({ event: "payment.cancelled", orderId }), "", {
        eventId,
        event: "payment.cancelled",
        orderId,
      });
    } else {
      // TIMEOUT / PENDING remains in PENDING state
      return { status: "TIMEOUT_RECORDED", orderId, currentStatus: "PENDING" };
    }
  }
}
