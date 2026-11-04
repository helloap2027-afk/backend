import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface GetNotificationsQuery {
  role?: "customer" | "merchant" | "admin" | "all";
  recipient?: string;
  status?: "ALL" | "UNREAD" | "READ";
  type?: string;
  search?: string;
  page?: number | string;
  pageSize?: number | string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    this.seedSampleNotificationsIfEmpty();
  }

  /**
   * Seed realistic customer and merchant notifications if none exist
   */
  seedSampleNotificationsIfEmpty() {
    try {
      const customerNotifs = this.db.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM notifications WHERE recipient = 'CUSTOMER' OR recipient = 'customer'"
      );
      const merchantNotifs = this.db.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM notifications WHERE recipient = 'MERCHANT' OR recipient = 'merchant'"
      );

      const now = Date.now();
      const insertNotif = (
        id: string,
        title: string,
        message: string,
        type: string,
        recipient: string,
        isRead: number,
        relatedEntity: string | null,
        relatedId: string | null,
        createdAt: string,
        readAt: string | null
      ) => {
        this.db.execute(
          `INSERT OR IGNORE INTO notifications (id, title, message, type, recipient, is_read, related_entity, related_id, created_at, read_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, title, message, type, recipient, isRead, relatedEntity, relatedId, createdAt, readAt]
        );
      };

      if (!customerNotifs || customerNotifs[0]?.count === 0) {
        // Customer Sample Notifications
        insertNotif(
          "notif_cust_001",
          "15-Minute Deal Quote Ready!",
          "3 verified contractors in Hitec City, Hyderabad provided competitive price quotes for your AC Deep Cleaning request.",
          "QUOTE_RECEIVED",
          "CUSTOMER",
          0,
          "enquiries",
          "DEAL-15M-1001",
          new Date(now - 12 * 60 * 1000).toISOString(),
          null
        );

        insertNotif(
          "notif_cust_002",
          "Special Weekend Offer: 1+1 on Cocktails",
          "Amnesia Sky Bar & Lounge is offering 1+1 craft cocktails for all verified Hello members this Friday.",
          "OFFER_ALERT",
          "CUSTOMER",
          0,
          "businesses",
          "biz-amnesia-skybar",
          new Date(now - 45 * 60 * 1000).toISOString(),
          null
        );

        insertNotif(
          "notif_cust_003",
          "Doctor Callback Scheduled",
          "Siri Dental Care confirmed your appointment callback request for tomorrow at 10:30 AM in Vijayawada.",
          "ENQUIRY_UPDATE",
          "CUSTOMER",
          1,
          "enquiries",
          "ENQ-2026-8819",
          new Date(now - 3 * 3600 * 1000).toISOString(),
          new Date(now - 2 * 3600 * 1000).toISOString()
        );

        insertNotif(
          "notif_cust_004",
          "DPDP Act 2023 Account Verified",
          "Your mobile number has been securely verified. Zero spam guarantee and masked phone numbers active.",
          "KYC_VERIFICATION",
          "CUSTOMER",
          1,
          "users",
          "usr_verified",
          new Date(now - 24 * 3600 * 1000).toISOString(),
          new Date(now - 23 * 3600 * 1000).toISOString()
        );

        insertNotif(
          "notif_cust_005",
          "Flat ₹500 Off on Packers & Movers",
          "Srinivasa Logistics offers exclusive seasonal discounts for household shifting between Guntur & Hyderabad.",
          "SPECIAL_OFFER",
          "CUSTOMER",
          0,
          "businesses",
          "biz-srinivasa-packers",
          new Date(now - 2 * 24 * 3600 * 1000).toISOString(),
          null
        );
      }

      if (!merchantNotifs || merchantNotifs[0]?.count === 0) {
        // Merchant / Vendor Sample Notifications
        insertNotif(
          "notif_merch_001",
          "New Customer Lead: AC Repair & Service",
          "Vikram Reddy in Hitec City, Hyderabad requested an instant quote with budget ₹4,500. Respond within 15 minutes to secure this lead!",
          "LEAD_RECEIVED",
          "MERCHANT",
          0,
          "enquiries",
          "DEAL-15M-36611",
          new Date(now - 8 * 60 * 1000).toISOString(),
          null
        );

        insertNotif(
          "notif_merch_002",
          "Business Listing Approved by Admin!",
          "Congratulations! Your business listing 'Hyderabad Tech Automation' has been reviewed and approved by Super Admin. Verified badge is now live.",
          "KYC_VERIFICATION",
          "MERCHANT",
          0,
          "businesses",
          "biz-approved-99",
          new Date(now - 55 * 60 * 1000).toISOString(),
          null
        );

        insertNotif(
          "notif_merch_003",
          "New 5-Star Customer Review",
          "Ravi Kumar posted a 5-star review: 'Outstanding royal claypot biryani and family ambiance near Benz Circle!'",
          "REVIEW_RECEIVED",
          "MERCHANT",
          0,
          "reviews",
          "rev-amravati-1",
          new Date(now - 2 * 3600 * 1000).toISOString(),
          null
        );

        insertNotif(
          "notif_merch_004",
          "Merchant Growth Plan Active",
          "Your Pro Merchant membership is active with priority SEO placement and unlimited instant lead notifications.",
          "SUBSCRIPTION_UPDATE",
          "MERCHANT",
          1,
          "subscriptions",
          "sub-active-101",
          new Date(now - 24 * 3600 * 1000).toISOString(),
          new Date(now - 20 * 3600 * 1000).toISOString()
        );

        insertNotif(
          "notif_merch_005",
          "Store Profile Traffic Surge: +42 Views",
          "Your store card appeared in 142 search queries in Hyderabad today. Keep your catalog updated to convert more customers.",
          "SYSTEM_ALERT",
          "MERCHANT",
          1,
          "businesses",
          "biz-amnesia-skybar",
          new Date(now - 2 * 24 * 3600 * 1000).toISOString(),
          new Date(now - 24 * 3600 * 1000).toISOString()
        );
      }
    } catch (err) {
      console.warn("[NotificationsService] Non-fatal notification seeding check:", err);
    }
  }

  /**
   * Dynamic notifications query with role, recipient, and status filtering
   */
  getNotifications(query: GetNotificationsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Role filtering (Customer, Merchant, Admin, All)
    if (query.role === "customer") {
      whereClauses.push(
        "(recipient = 'CUSTOMER' OR recipient = 'customer' OR type IN ('QUOTE_RECEIVED', 'OFFER_ALERT', 'SPECIAL_OFFER', 'CUSTOMER_ALERT'))"
      );
    } else if (query.role === "merchant") {
      whereClauses.push(
        "(recipient = 'MERCHANT' OR recipient = 'merchant' OR type IN ('LEAD_RECEIVED', 'KYC_VERIFICATION', 'REVIEW_RECEIVED', 'SUBSCRIPTION_UPDATE', 'MERCHANT_ALERT'))"
      );
    } else if (query.role === "admin") {
      whereClauses.push(
        "(recipient = 'Super Admin' OR recipient = 'ADMIN' OR type IN ('KYC_VERIFICATION', 'FINANCIAL', 'CMS_UPDATE', 'SYSTEM_ALERT'))"
      );
    }

    // Specific recipient phone or user ID
    if (query.recipient) {
      whereClauses.push("(recipient = ? OR recipient LIKE ?)");
      params.push(query.recipient, `%${query.recipient}%`);
    }

    // Read status filter
    if (query.status === "UNREAD") {
      whereClauses.push("is_read = 0");
    } else if (query.status === "READ") {
      whereClauses.push("is_read = 1");
    }

    // Type filter
    if (query.type && query.type !== "ALL") {
      whereClauses.push("type = ?");
      params.push(query.type);
    }

    // Text search
    if (query.search && query.search.trim()) {
      const q = `%${query.search.trim()}%`;
      whereClauses.push("(title LIKE ? OR message LIKE ?)");
      params.push(q, q);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countRow = this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM notifications ${whereSql}`,
      params
    );
    const totalRecords = countRow?.total || 0;
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;

    const records = this.db.query<any>(
      `SELECT * FROM notifications ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // Unread count for this filtered view
    const unreadCountRow = this.db.queryOne<{ unread: number }>(
      `SELECT COUNT(*) as unread FROM notifications ${whereSql ? whereSql + " AND is_read = 0" : "WHERE is_read = 0"}`,
      params
    );

    return {
      data: records,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      unreadCount: unreadCountRow?.unread || 0,
    };
  }

  /**
   * Get dynamic unread counts for Customer, Merchant, and Super Admin
   */
  getUnreadCounts(recipient?: string) {
    const customerUnread = (
      this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0 AND (recipient = 'CUSTOMER' OR recipient = 'customer' OR type IN ('QUOTE_RECEIVED', 'OFFER_ALERT', 'SPECIAL_OFFER'))`
      ) || { count: 0 }
    ).count;

    const merchantUnread = (
      this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0 AND (recipient = 'MERCHANT' OR recipient = 'merchant' OR type IN ('LEAD_RECEIVED', 'KYC_VERIFICATION', 'REVIEW_RECEIVED'))`
      ) || { count: 0 }
    ).count;

    const adminUnread = (
      this.db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM notifications WHERE is_read = 0 AND (recipient = 'Super Admin' OR recipient = 'ADMIN')`
      ) || { count: 0 }
    ).count;

    const totalUnread = (
      this.db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0") || { count: 0 }
    ).count;

    return {
      customerUnread,
      merchantUnread,
      adminUnread,
      totalUnread,
    };
  }

  /**
   * Mark individual notification as read
   */
  markAsRead(id: string) {
    const notif = this.db.queryOne<any>("SELECT * FROM notifications WHERE id = ?", [id]);
    if (!notif) {
      throw new NotFoundException(`Notification '${id}' not found`);
    }

    const now = new Date().toISOString();
    this.db.execute("UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?", [now, id]);

    return {
      success: true,
      id,
      isRead: true,
      readAt: now,
      message: "Notification marked as read in database.",
    };
  }

  /**
   * Mark all notifications as read for a given audience role
   */
  markAllAsRead(role?: "customer" | "merchant" | "admin" | "all") {
    const now = new Date().toISOString();

    if (role === "customer") {
      this.db.execute(
        `UPDATE notifications SET is_read = 1, read_at = ? 
         WHERE is_read = 0 AND (recipient = 'CUSTOMER' OR recipient = 'customer' OR type IN ('QUOTE_RECEIVED', 'OFFER_ALERT', 'SPECIAL_OFFER'))`,
        [now]
      );
    } else if (role === "merchant") {
      this.db.execute(
        `UPDATE notifications SET is_read = 1, read_at = ? 
         WHERE is_read = 0 AND (recipient = 'MERCHANT' OR recipient = 'merchant' OR type IN ('LEAD_RECEIVED', 'KYC_VERIFICATION', 'REVIEW_RECEIVED'))`,
        [now]
      );
    } else if (role === "admin") {
      this.db.execute(
        `UPDATE notifications SET is_read = 1, read_at = ? WHERE is_read = 0 AND (recipient = 'Super Admin' OR recipient = 'ADMIN')`,
        [now]
      );
    } else {
      this.db.execute("UPDATE notifications SET is_read = 1, read_at = ? WHERE is_read = 0", [now]);
    }

    return {
      success: true,
      role: role || "all",
      message: "All matching notifications marked as read in database.",
      unreadCount: 0,
    };
  }

  /**
   * Delete single notification
   */
  deleteNotification(id: string) {
    this.db.execute("DELETE FROM notifications WHERE id = ?", [id]);
    return {
      success: true,
      id,
      message: "Notification deleted successfully.",
    };
  }

  /**
   * Bulk delete notifications
   */
  bulkDeleteNotifications(ids: string[]) {
    if (!ids || ids.length === 0) return { success: true, deletedCount: 0 };
    const placeholders = ids.map(() => "?").join(",");
    const res = this.db.execute(`DELETE FROM notifications WHERE id IN (${placeholders})`, ids);
    return {
      success: true,
      deletedCount: res.changes,
      message: `${res.changes} notifications deleted.`,
    };
  }
}
