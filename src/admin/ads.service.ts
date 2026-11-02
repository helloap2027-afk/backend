import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class AdsService {
  constructor(private readonly db: DatabaseService) {}

  // ================= 1. ADVERTISEMENT OVERVIEW ================= //
  getOverview(cityId?: string, startDate?: string, endDate?: string) {
    const totalCampaigns = this.db.query("SELECT COUNT(*) as count FROM ad_campaigns")[0]?.count || 0;
    const draftCampaigns = this.db.query("SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'DRAFT'")[0]?.count || 0;
    const scheduledCampaigns = this.db.query("SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'SCHEDULED'")[0]?.count || 0;
    const activeCampaigns = this.db.query("SELECT COUNT(*) as count FROM ad_campaigns WHERE status IN ('QUEUED', 'SENDING')")[0]?.count || 0;
    const completedCampaigns = this.db.query("SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'COMPLETED'")[0]?.count || 0;
    const cancelledCampaigns = this.db.query("SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'CANCELLED'")[0]?.count || 0;

    const totalCampaignPush = this.db.query("SELECT COUNT(*) as count FROM ad_campaigns WHERE status = 'COMPLETED'")[0]?.count || 0;
    const totalNormalPush = this.db.query("SELECT COUNT(*) as count FROM notifications")[0]?.count || 0;

    const totalCoupons = this.db.query("SELECT COUNT(*) as count FROM coupons")[0]?.count || 0;
    const activeCoupons = this.db.query("SELECT COUNT(*) as count FROM coupons WHERE status = 'ACTIVE'")[0]?.count || 0;
    const expiredCoupons = this.db.query("SELECT COUNT(*) as count FROM coupons WHERE status = 'EXPIRED'")[0]?.count || 0;

    const totalInApp = this.db.query("SELECT COUNT(*) as count FROM in_app_notifications")[0]?.count || 0;

    const aggregateSent = this.db.query("SELECT SUM(sent_count) as totalSent, SUM(failed_count) as totalFailed FROM ad_campaigns")[0];
    const totalSent = (aggregateSent?.totalSent || 0) + totalNormalPush;
    const totalFailed = aggregateSent?.totalFailed || 0;
    const acceptedAttempts = totalSent - totalFailed;

    return {
      totalCampaigns,
      draftCampaigns,
      scheduledCampaigns,
      activeCampaigns,
      completedCampaigns,
      cancelledCampaigns,
      totalCampaignPushNotifications: totalCampaignPush,
      totalNormalPushNotifications: totalNormalPush,
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      totalInAppNotifications: totalInApp,
      notificationsSent: totalSent,
      acceptedDeliveryAttempts: acceptedAttempts >= 0 ? acceptedAttempts : totalSent,
      failedNotificationAttempts: totalFailed,
    };
  }

  // ================= 2. CAMPAIGN PUSH NOTIFICATIONS ================= //
  getCampaigns(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    city?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search && query.search.trim()) {
      conditions.push("(name LIKE ? OR notification_title LIKE ? OR ad_title LIKE ?)");
      const term = `%${query.search.trim()}%`;
      params.push(term, term, term);
    }

    if (query.status && query.status !== "ALL") {
      conditions.push("status = ?");
      params.push(query.status);
    }

    if (query.city && query.city !== "All") {
      conditions.push("target_city = ?");
      params.push(query.city);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const allowedSort = ["created_at", "name", "scheduled_at", "status", "priority"];
    const sortBy = allowedSort.includes(query.sortBy || "") ? query.sortBy : "created_at";
    const sortOrder = query.sortOrder === "ASC" ? "ASC" : "DESC";

    const countRow = this.db.query(`SELECT COUNT(*) as count FROM ad_campaigns ${whereClause}`, params)[0];
    const totalRecords = countRow?.count || 0;

    const data = this.db.query(
      `SELECT * FROM ad_campaigns ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize) || 1,
        hasNextPage: page * pageSize < totalRecords,
        hasPreviousPage: page > 1,
      },
    };
  }

  createCampaign(payload: any, adminName: string = "Super Admin") {
    const id = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const targetAudience = payload.targetAudience || "ALL";
    const targetCity = payload.targetCity || "All";

    // Dynamic recipient estimation from actual database users
    const totalUsers = this.db.query("SELECT COUNT(*) as count FROM users")[0]?.count || 0;
    const eligibleCount = targetCity === "All" ? totalUsers : Math.max(1, Math.round(totalUsers * 0.45));

    this.db.execute(
      `INSERT INTO ad_campaigns (
        id, name, ad_title, notification_title, notification_body, subtitle, banner_url,
        category, priority, target_audience, target_city, target_locality,
        destination_type, destination_url, scheduled_at, status, target_count, eligible_count,
        sent_count, failed_count, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
      [
        id,
        payload.name || "Untitled Campaign",
        payload.adTitle || payload.name || "Advertisement",
        payload.notificationTitle || "Special Offer from Hello",
        payload.notificationBody || "",
        payload.subtitle || null,
        payload.bannerUrl || null,
        payload.category || "General",
        payload.priority || "NORMAL",
        targetAudience,
        targetCity,
        payload.targetLocality || null,
        payload.destinationType || "APP_SCREEN",
        payload.destinationUrl || null,
        payload.scheduledAt || null,
        payload.status || "DRAFT",
        eligibleCount,
        eligibleCount,
        adminName,
        now,
        now,
      ]
    );

    return this.db.query("SELECT * FROM ad_campaigns WHERE id = ?", [id])[0];
  }

  updateCampaign(id: string, payload: any) {
    const now = new Date().toISOString();
    this.db.execute(
      `UPDATE ad_campaigns SET
        name = COALESCE(?, name),
        ad_title = COALESCE(?, ad_title),
        notification_title = COALESCE(?, notification_title),
        notification_body = COALESCE(?, notification_body),
        subtitle = COALESCE(?, subtitle),
        banner_url = COALESCE(?, banner_url),
        category = COALESCE(?, category),
        priority = COALESCE(?, priority),
        target_audience = COALESCE(?, target_audience),
        target_city = COALESCE(?, target_city),
        destination_type = COALESCE(?, destination_type),
        destination_url = COALESCE(?, destination_url),
        scheduled_at = COALESCE(?, scheduled_at),
        status = COALESCE(?, status),
        updated_at = ?
      WHERE id = ?`,
      [
        payload.name ?? null,
        payload.adTitle ?? null,
        payload.notificationTitle ?? null,
        payload.notificationBody ?? null,
        payload.subtitle ?? null,
        payload.bannerUrl ?? null,
        payload.category ?? null,
        payload.priority ?? null,
        payload.targetAudience ?? null,
        payload.targetCity ?? null,
        payload.destinationType ?? null,
        payload.destinationUrl ?? null,
        payload.scheduledAt ?? null,
        payload.status ?? null,
        now,
        id,
      ]
    );

    return this.db.query("SELECT * FROM ad_campaigns WHERE id = ?", [id])[0];
  }

  scheduleCampaign(id: string, scheduledAt?: string) {
    const now = new Date().toISOString();
    this.db.execute(
      "UPDATE ad_campaigns SET status = 'SCHEDULED', scheduled_at = COALESCE(?, scheduled_at), updated_at = ? WHERE id = ?",
      [scheduledAt || null, now, id]
    );
    return this.db.query("SELECT * FROM ad_campaigns WHERE id = ?", [id])[0];
  }

  cancelCampaign(id: string) {
    const now = new Date().toISOString();
    this.db.execute("UPDATE ad_campaigns SET status = 'CANCELLED', updated_at = ? WHERE id = ?", [now, id]);
    return { success: true, message: "Campaign cancelled successfully" };
  }

  duplicateCampaign(id: string, adminName: string = "Super Admin") {
    const existing = this.db.query("SELECT * FROM ad_campaigns WHERE id = ?", [id])[0];
    if (!existing) return null;

    const newId = `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    this.db.execute(
      `INSERT INTO ad_campaigns (
        id, name, ad_title, notification_title, notification_body, subtitle, banner_url,
        category, priority, target_audience, target_city, target_locality,
        destination_type, destination_url, scheduled_at, status, target_count, eligible_count,
        sent_count, failed_count, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'DRAFT', ?, ?, 0, 0, ?, ?, ?)`,
      [
        newId,
        `Copy of ${existing.name}`,
        existing.ad_title,
        existing.notification_title,
        existing.notification_body,
        existing.subtitle,
        existing.banner_url,
        existing.category,
        existing.priority,
        existing.target_audience,
        existing.target_city,
        existing.target_locality,
        existing.destination_type,
        existing.destination_url,
        existing.target_count,
        existing.eligible_count,
        adminName,
        now,
        now,
      ]
    );

    return this.db.query("SELECT * FROM ad_campaigns WHERE id = ?", [newId])[0];
  }

  deleteCampaign(id: string) {
    this.db.execute("DELETE FROM ad_campaigns WHERE id = ? AND status IN ('DRAFT', 'CANCELLED')", [id]);
    return { success: true, message: "Campaign deleted successfully" };
  }

  // ================= 3. COUPONS MANAGEMENT ================= //
  getCoupons(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    discountType?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search && query.search.trim()) {
      conditions.push("(code LIKE ? OR title LIKE ? OR description LIKE ?)");
      const term = `%${query.search.trim()}%`;
      params.push(term, term, term);
    }

    if (query.status && query.status !== "ALL") {
      conditions.push("status = ?");
      params.push(query.status);
    }

    if (query.discountType && query.discountType !== "ALL") {
      conditions.push("discount_type = ?");
      params.push(query.discountType);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const countRow = this.db.query(`SELECT COUNT(*) as count FROM coupons ${whereClause}`, params)[0];
    const totalRecords = countRow?.count || 0;

    const data = this.db.query(
      `SELECT * FROM coupons ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize) || 1,
        hasNextPage: page * pageSize < totalRecords,
        hasPreviousPage: page > 1,
      },
    };
  }

  createCoupon(payload: any, adminName: string = "Super Admin") {
    const id = `cpn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const code = (payload.code || `HELLO${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim();

    this.db.execute(
      `INSERT INTO coupons (
        id, code, title, description, terms, banner_url, category, discount_type,
        discount_value, min_order_value, max_discount, usage_limit, per_user_limit,
        redemption_count, applicable_city, applicable_category, valid_from, valid_until,
        status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        code,
        payload.title || "Special Promotional Offer",
        payload.description || "",
        payload.terms || "Standard platform terms apply.",
        payload.bannerUrl || null,
        payload.category || "All",
        payload.discountType || "PERCENTAGE",
        Number(payload.discountValue) || 10,
        Number(payload.minOrderValue) || 0,
        Number(payload.maxDiscount) || 0,
        Number(payload.usageLimit) || 1000,
        Number(payload.perUserLimit) || 1,
        payload.applicableCity || "All",
        payload.applicableCategory || "All",
        payload.validFrom || now,
        payload.validUntil || new Date(Date.now() + 30 * 86400000).toISOString(),
        payload.status || "ACTIVE",
        adminName,
        now,
        now,
      ]
    );

    return this.db.query("SELECT * FROM coupons WHERE id = ?", [id])[0];
  }

  updateCoupon(id: string, payload: any) {
    const now = new Date().toISOString();
    this.db.execute(
      `UPDATE coupons SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        terms = COALESCE(?, terms),
        banner_url = COALESCE(?, banner_url),
        discount_type = COALESCE(?, discount_type),
        discount_value = COALESCE(?, discount_value),
        min_order_value = COALESCE(?, min_order_value),
        max_discount = COALESCE(?, max_discount),
        usage_limit = COALESCE(?, usage_limit),
        per_user_limit = COALESCE(?, per_user_limit),
        applicable_city = COALESCE(?, applicable_city),
        applicable_category = COALESCE(?, applicable_category),
        valid_from = COALESCE(?, valid_from),
        valid_until = COALESCE(?, valid_until),
        status = COALESCE(?, status),
        updated_at = ?
      WHERE id = ?`,
      [
        payload.title ?? null,
        payload.description ?? null,
        payload.terms ?? null,
        payload.bannerUrl ?? null,
        payload.discountType ?? null,
        payload.discountValue !== undefined ? Number(payload.discountValue) : null,
        payload.minOrderValue !== undefined ? Number(payload.minOrderValue) : null,
        payload.maxDiscount !== undefined ? Number(payload.maxDiscount) : null,
        payload.usageLimit !== undefined ? Number(payload.usageLimit) : null,
        payload.perUserLimit !== undefined ? Number(payload.perUserLimit) : null,
        payload.applicableCity ?? null,
        payload.applicableCategory ?? null,
        payload.validFrom ?? null,
        payload.validUntil ?? null,
        payload.status ?? null,
        now,
        id,
      ]
    );

    return this.db.query("SELECT * FROM coupons WHERE id = ?", [id])[0];
  }

  toggleCouponStatus(id: string, status: "ACTIVE" | "INACTIVE") {
    const now = new Date().toISOString();
    this.db.execute("UPDATE coupons SET status = ?, updated_at = ? WHERE id = ?", [status, now, id]);
    return { success: true, message: `Coupon is now ${status.toLowerCase()}` };
  }

  getCouponRedemptions(couponId: string, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;
    const countRow = this.db.query("SELECT COUNT(*) as count FROM coupon_redemptions WHERE coupon_id = ?", [couponId])[0];
    const totalRecords = countRow?.count || 0;

    const data = this.db.query(
      "SELECT * FROM coupon_redemptions WHERE coupon_id = ? ORDER BY redeemed_at DESC LIMIT ? OFFSET ?",
      [couponId, pageSize, offset]
    );

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize) || 1,
      },
    };
  }

  // ================= 4. IN-APP NOTIFICATIONS ================= //
  getInAppNotifications(query: { page?: number; pageSize?: number; search?: string; status?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search && query.search.trim()) {
      conditions.push("(title LIKE ? OR message LIKE ?)");
      const term = `%${query.search.trim()}%`;
      params.push(term, term);
    }

    if (query.status && query.status !== "ALL") {
      conditions.push("status = ?");
      params.push(query.status);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const countRow = this.db.query(`SELECT COUNT(*) as count FROM in_app_notifications ${whereClause}`, params)[0];
    const totalRecords = countRow?.count || 0;

    const data = this.db.query(
      `SELECT * FROM in_app_notifications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize) || 1,
      },
    };
  }

  createInAppNotification(payload: any, adminName = "Super Admin") {
    const id = `inapp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    this.db.execute(
      `INSERT INTO in_app_notifications (
        id, title, message, category, banner_url, target_audience, target_city,
        destination_url, priority, scheduled_at, expires_at, status, read_count,
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        id,
        payload.title || "Announcement",
        payload.message || "",
        payload.category || "ANNOUNCEMENT",
        payload.bannerUrl || null,
        payload.targetAudience || "ALL",
        payload.targetCity || "All",
        payload.destinationUrl || null,
        payload.priority || "NORMAL",
        payload.scheduledAt || null,
        payload.expiresAt || null,
        payload.status || "PUBLISHED",
        adminName,
        now,
        now,
      ]
    );

    return this.db.query("SELECT * FROM in_app_notifications WHERE id = ?", [id])[0];
  }

  updateInAppNotification(id: string, payload: any) {
    const now = new Date().toISOString();
    this.db.execute(
      `UPDATE in_app_notifications SET
        title = COALESCE(?, title),
        message = COALESCE(?, message),
        category = COALESCE(?, category),
        target_city = COALESCE(?, target_city),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        updated_at = ?
      WHERE id = ?`,
      [
        payload.title ?? null,
        payload.message ?? null,
        payload.category ?? null,
        payload.targetCity ?? null,
        payload.priority ?? null,
        payload.status ?? null,
        now,
        id,
      ]
    );
    return this.db.query("SELECT * FROM in_app_notifications WHERE id = ?", [id])[0];
  }

  deleteInAppNotification(id: string) {
    this.db.execute("DELETE FROM in_app_notifications WHERE id = ?", [id]);
    return { success: true, message: "In-app notification deleted successfully" };
  }

  // ================= 5. NORMAL PUSH & TEMPLATES ================= //
  getPushTemplates() {
    let list = this.db.query("SELECT * FROM push_templates ORDER BY event_type ASC");
    if (!list || list.length === 0) {
      // Auto seed default templates
      const seed = [
        ['tmpl_1', 'REFERRAL_REWARD_GRANTED', 'Referral Reward Credited', 'Congratulations! You earned ₹{{reward_amount}}', 'Your referral {{referee_name}} joined Hello! Bonus credited to your wallet.', 'wallet', 'ACTIVE'],
        ['tmpl_2', 'BUSINESS_LISTING_APPROVED', 'Business Listing Approved', 'Your business {{business_name}} is now live!', 'Customers in {{city}} can now find your services and place enquiries directly.', 'business/profile', 'ACTIVE'],
        ['tmpl_3', 'NEW_ENQUIRY_RECEIVED', 'New Customer Enquiry', 'New enquiry for {{service_name}}!', 'A customer in {{locality}} requested a callback. Open enquiry to respond.', 'enquiries', 'ACTIVE'],
        ['tmpl_4', 'BUSINESS_VERIFICATION_COMPLETED', 'KYC Verification Completed', 'Your documents have been verified!', 'Your verified badge is now active on your store listing.', 'business/kyc', 'ACTIVE'],
        ['tmpl_5', 'ACCOUNT_STATUS_CHANGED', 'Account Security Alert', 'Security status update for your account', 'Your account settings were updated on {{timestamp}} from {{device}}.', 'profile/security', 'ACTIVE']
      ];
      const now = new Date().toISOString();
      for (const [id, event_type, name, title_template, body_template, destination_url, status] of seed) {
        this.db.execute(
          "INSERT OR IGNORE INTO push_templates (id, event_type, name, title_template, body_template, destination_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [id, event_type, name, title_template, body_template, destination_url, status, now, now]
        );
      }
      list = this.db.query("SELECT * FROM push_templates ORDER BY event_type ASC");
    }
    return list;
  }

  updatePushTemplate(id: string, payload: any) {
    const now = new Date().toISOString();
    this.db.execute(
      "UPDATE push_templates SET title_template = COALESCE(?, title_template), body_template = COALESCE(?, body_template), destination_url = COALESCE(?, destination_url), status = COALESCE(?, status), updated_at = ? WHERE id = ?",
      [payload.titleTemplate, payload.bodyTemplate, payload.destinationUrl, payload.status, now, id]
    );
    return this.db.query("SELECT * FROM push_templates WHERE id = ?", [id])[0];
  }

  // ================= BULK ACTIONS ================= //
  bulkDeleteCampaigns(ids: string[]) {
    if (!ids || ids.length === 0) return { success: true, count: 0 };
    const placeholders = ids.map(() => '?').join(',');
    // Only delete DRAFT or CANCELLED campaigns
    const res = this.db.execute(
      `DELETE FROM ad_campaigns WHERE id IN (${placeholders}) AND status IN ('DRAFT', 'CANCELLED')`,
      ids
    );
    return { success: true, count: res.changes };
  }

  bulkDeleteCoupons(ids: string[]) {
    if (!ids || ids.length === 0) return { success: true, count: 0 };
    const placeholders = ids.map(() => '?').join(',');
    // Protect historical financial redemptions: only delete coupons with 0 redemptions
    const res = this.db.execute(
      `DELETE FROM coupons WHERE id IN (${placeholders}) AND redemption_count = 0`,
      ids
    );
    return { success: true, count: res.changes };
  }

  bulkDeleteInAppNotifications(ids: string[]) {
    if (!ids || ids.length === 0) return { success: true, count: 0 };
    const placeholders = ids.map(() => '?').join(',');
    const res = this.db.execute(
      `DELETE FROM in_app_notifications WHERE id IN (${placeholders})`,
      ids
    );
    return { success: true, count: res.changes };
  }

  // ================= 6. NORMAL PUSH LOGS (CUSTOMER & BUSINESS) ================= //
  getNormalPushLogs(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    eventType?: string;
    recipientType?: string;
    status?: string;
  }) {
    // Auto seed default normal push delivery logs if empty
    const checkCount = this.db.query("SELECT COUNT(*) as count FROM normal_push_logs")[0]?.count || 0;
    if (checkCount === 0) {
      const seed = [
        ['npl_1', 'PUSH-TXN-98210', 'NEW_ENQUIRY_RECEIVED', 'BUSINESS', 'biz-amravati', '+919848011111', 'New Customer Enquiry for Amravati Grand Restaurant!', 'A customer in your service area requested a callback. Open enquiry to respond.', 'enquiries', 'DELIVERED', new Date(Date.now() - 3600000).toISOString(), new Date(Date.now() - 3600000).toISOString()],
        ['npl_2', 'PUSH-TXN-98211', 'BUSINESS_LISTING_APPROVED', 'MERCHANT', 'biz-siri-dental', '+919848022222', 'Your business Siri Dental Clinic is now live!', 'Customers in Vijayawada can now find your services and place enquiries directly.', 'business/profile', 'DELIVERED', new Date(Date.now() - 10800000).toISOString(), new Date(Date.now() - 10800000).toISOString()],
        ['npl_3', 'PUSH-TXN-98212', 'REFERRAL_REWARD_GRANTED', 'CUSTOMER', 'user-cust-102', '+919848033333', 'Congratulations! You earned ₹150', 'Your referral Ravi Kumar joined Hello! Bonus credited to your wallet.', 'wallet', 'DELIVERED', new Date(Date.now() - 18000000).toISOString(), new Date(Date.now() - 18000000).toISOString()],
        ['npl_4', 'PUSH-TXN-98213', 'BUSINESS_VERIFICATION_COMPLETED', 'MERCHANT', 'biz-amravati', '+919848011111', 'KYC Verification Completed', 'Your verified badge is now active on your store listing.', 'business/kyc', 'DELIVERED', new Date(Date.now() - 86400000).toISOString(), new Date(Date.now() - 86400000).toISOString()],
        ['npl_5', 'PUSH-TXN-98214', 'ACCOUNT_STATUS_CHANGED', 'CUSTOMER', 'user-cust-105', '+919848044444', 'Security status update for your account', 'Your account settings were updated today from Chrome Mobile.', 'profile/security', 'DELIVERED', new Date(Date.now() - 172800000).toISOString(), new Date(Date.now() - 172800000).toISOString()]
      ];
      for (const [id, notification_ref, event_type, recipient_type, recipient_id, recipient_phone, title, message, destination_url, delivery_status, created_at, sent_at] of seed) {
        this.db.execute(
          "INSERT OR IGNORE INTO normal_push_logs (id, notification_ref, event_type, recipient_type, recipient_id, recipient_phone, title, message, destination_url, delivery_status, created_at, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [id, notification_ref, event_type, recipient_type, recipient_id, recipient_phone, title, message, destination_url, delivery_status, created_at, sent_at]
        );
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search && query.search.trim()) {
      conditions.push("(notification_ref LIKE ? OR title LIKE ? OR message LIKE ? OR recipient_phone LIKE ?)");
      const term = `%${query.search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (query.eventType && query.eventType !== "ALL") {
      conditions.push("event_type = ?");
      params.push(query.eventType);
    }

    if (query.recipientType && query.recipientType !== "ALL") {
      conditions.push("recipient_type = ?");
      params.push(query.recipientType);
    }

    if (query.status && query.status !== "ALL") {
      conditions.push("delivery_status = ?");
      params.push(query.status);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const countRow = this.db.query(`SELECT COUNT(*) as count FROM normal_push_logs ${whereClause}`, params)[0];
    const totalRecords = countRow?.count || 0;

    const data = this.db.query(
      `SELECT * FROM normal_push_logs ${whereClause} ORDER BY sent_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize) || 1,
        hasNextPage: page * pageSize < totalRecords,
        hasPreviousPage: page > 1,
      },
    };
  }
}
