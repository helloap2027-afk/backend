import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ConflictException,
  ForbiddenException 
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface WalletRecord {
  id: string;
  user_id: string;
  business_id?: string;
  user_type: "CUSTOMER" | "MERCHANT";
  currency: string;
  balance_paise: number;
  balance: number;
  status: "ACTIVE" | "FROZEN" | "SUSPENDED";
  created_at: string;
  updated_at: string;
}

export interface WalletTransactionRecord {
  id: string;
  wallet_id: string;
  user_id?: string;
  business_id?: string;
  user_name: string;
  user_type: "CUSTOMER" | "MERCHANT";
  type: "CREDIT" | "DEBIT" | "REFUND" | "TOPUP" | "WITHDRAWAL";
  category: string;
  amount: number;
  amount_paise: number;
  balance_before: number;
  balance_before_paise: number;
  balance_after: number;
  balance_after_paise: number;
  reference: string;
  reason?: string;
  admin_id?: string;
  admin_remarks?: string;
  idempotency_key?: string;
  correlation_id?: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | "REVERSED";
  created_at: string;
}

export interface CreditDebitInput {
  userId: string;
  userType: "CUSTOMER" | "MERCHANT";
  amount: number; // in INR
  category?: string;
  reason: string;
  adminId: string;
  adminRemarks?: string;
  idempotencyKey?: string;
  externalRef?: string;
  businessId?: string;
}

@Injectable()
export class WalletLedgerService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Helper to resolve managed Push Template and render dynamic variables
   */
  public renderPushTemplate(eventType: "WALLET_CREDITED" | "WALLET_DEBITED", vars: Record<string, any>) {
    const tmpl = this.db.queryOne<any>(
      "SELECT * FROM push_templates WHERE event_type = ? AND status = 'ACTIVE' LIMIT 1",
      [eventType]
    );

    let title = tmpl?.title_template || (eventType === "WALLET_CREDITED" ? "Wallet Credited Successfully" : "Wallet Debited");
    let body = tmpl?.body_template || (eventType === "WALLET_CREDITED" ? "₹{{amount}} has been credited to your HELLO-Hi wallet." : "₹{{amount}} has been debited from your HELLO-Hi wallet.");

    for (const [k, v] of Object.entries(vars)) {
      const regex = new RegExp(`{{\\s*${k}\\s*}}`, "g");
      title = title.replace(regex, String(v));
      body = body.replace(regex, String(v));
    }

    return { title, body };
  }

  /**
   * Helper to dispatch transactional email via Email Management templates & logs
   */
  public dispatchWalletEmail(eventKey: "WALLET_CREDITED" | "WALLET_DEBITED", recipientEmail: string, vars: Record<string, any>) {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return { success: false, status: "SKIPPED", reason: "No valid recipient email address on file" };
    }

    try {
      // 1. Check event mapping
      const eventMapping = this.db.queryOne<any>(
        "SELECT * FROM email_event_mappings WHERE event_key = ? AND is_active = 1",
        [eventKey]
      );
      const templateKey = eventMapping ? eventMapping.template_key : `${eventKey}_EMAIL`;

      // 2. Fetch template
      const template = this.db.queryOne<any>(
        "SELECT * FROM email_templates WHERE template_key = ? AND status = 'PUBLISHED'",
        [templateKey]
      );

      if (!template) {
        return { success: false, status: "FAILED", reason: `No published template for ${templateKey}` };
      }

      let subject = template.subject_template || "";
      let bodyHtml = template.body_html || "";
      for (const [k, v] of Object.entries(vars)) {
        const regex = new RegExp(`{{\\s*${k}\\s*}}`, "g");
        subject = subject.replace(regex, String(v));
        bodyHtml = bodyHtml.replace(regex, String(v));
      }

      const now = new Date().toISOString();
      const ref = `EML-WLT-${Date.now()}`;
      const maskedEmail = recipientEmail.replace(/(.{2})(.*)(?=@)/, "$1***");

      this.db.execute(`
        INSERT INTO email_delivery_logs (
          id, email_ref, email_category, recipient_email, recipient_masked, sender_email,
          subject, template_key, provider, delivery_status, created_at, submitted_at, delivered_at
        ) VALUES (?, ?, 'TRANSACTIONAL', ?, ?, 'no-reply@hello-hi.in', ?, ?, 'SMTP', 'PROVIDER_ACCEPTED', ?, ?, NULL)
      `, [
        `log_wlt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ref,
        recipientEmail,
        maskedEmail,
        subject,
        templateKey,
        now,
        now
      ]);

      return { success: true, status: "PROVIDER_ACCEPTED", ref };
    } catch (e: any) {
      return { success: false, status: "FAILED", error: e?.message };
    }
  }
  public toPaise(amount: number): number {
    return Math.round(Number(amount) * 100);
  }

  /**
   * Safe conversion of integer paise to exact 2-decimal INR float.
   */
  public toRupees(paise: number): number {
    return Number((paise / 100).toFixed(2));
  }

  /**
   * Retrieve or provision a deterministic, authoritative wallet for a user and role.
   */
  public getOrCreateWallet(userId: string, userType: "CUSTOMER" | "MERCHANT", businessId?: string): WalletRecord {
    if (!userId) {
      throw new BadRequestException("User ID is required to access or create wallet");
    }

    // Try finding existing wallet
    let wallet = this.db.queryOne<any>(
      "SELECT * FROM wallets WHERE user_id = ? AND user_type = ?",
      [userId, userType]
    );

    if (!wallet) {
      // Find business_id for merchant if not explicitly provided
      let resolvedBusinessId: string | null = businessId || null;
      if (!resolvedBusinessId && userType === "MERCHANT") {
        const ownerRec = this.db.queryOne<any>(
          "SELECT business_id FROM business_owners WHERE user_id = ? LIMIT 1",
          [userId]
        );
        resolvedBusinessId = ownerRec?.business_id || null;
      }

      const walletId = `WAL_${userType.substring(0, 4)}_${userId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 12)}_${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      this.db.execute(`
        INSERT INTO wallets (id, user_id, business_id, user_type, currency, balance_paise, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'INR', 0, 'ACTIVE', ?, ?)
      `, [walletId, userId, resolvedBusinessId, userType, now, now]);

      wallet = this.db.queryOne<any>("SELECT * FROM wallets WHERE id = ?", [walletId]);
    }

    return {
      ...wallet,
      balance: this.toRupees(wallet.balance_paise || 0),
    };
  }

  /**
   * Get wallet for user by user ID and role context.
   */
  public getWallet(userId: string, userType: "CUSTOMER" | "MERCHANT"): WalletRecord | null {
    const wallet = this.db.queryOne<any>(
      "SELECT * FROM wallets WHERE user_id = ? AND user_type = ?",
      [userId, userType]
    );
    if (!wallet) return null;
    return {
      ...wallet,
      balance: this.toRupees(wallet.balance_paise || 0),
    };
  }

  /**
   * Atomically post an authorized Credit transaction into the immutable financial ledger.
   */
  public creditWallet(input: CreditDebitInput): { transaction: WalletTransactionRecord; wallet: WalletRecord } {
    const { userId, userType, amount, category, reason, adminId, adminRemarks, idempotencyKey, externalRef, businessId } = input;

    if (!amount || amount <= 0) {
      throw new BadRequestException("Credit amount must be greater than zero");
    }
    if (!reason || !reason.trim()) {
      throw new BadRequestException("Mandatory adjustment reason is required for credit");
    }

    const amountPaise = this.toPaise(amount);

    return this.db.transaction(() => {
      // 1. Idempotency check: if already processed, return stored transaction immediately
      if (idempotencyKey) {
        const existingTx = this.db.queryOne<any>(
          "SELECT * FROM wallet_transactions WHERE idempotency_key = ?",
          [idempotencyKey]
        );
        if (existingTx) {
          const currentWallet = this.getOrCreateWallet(userId, userType, businessId);
          return {
            transaction: {
              ...existingTx,
              amount: this.toRupees(existingTx.amount_paise || this.toPaise(existingTx.amount)),
              balance_before: this.toRupees(existingTx.balance_before_paise || 0),
              balance_after: this.toRupees(existingTx.balance_after_paise || this.toPaise(existingTx.balance_after)),
            },
            wallet: currentWallet,
          };
        }
      }

      // 2. Fetch or provision wallet
      const wallet = this.getOrCreateWallet(userId, userType, businessId);

      if (wallet.status === "FROZEN") {
        throw new ForbiddenException("Wallet is currently frozen. Cannot process credit operations.");
      }

      // 3. User details for readable ledger description
      const user = this.db.queryOne<any>("SELECT full_name, phone_number, email FROM users WHERE id = ?", [userId]);
      const userName = user?.full_name || (userType === "MERCHANT" ? "Business Partner" : "Customer");

      // 4. Calculate balances in integer paise
      const balanceBeforePaise = Number(wallet.balance_paise || 0);
      const balanceAfterPaise = balanceBeforePaise + amountPaise;
      const balanceBefore = this.toRupees(balanceBeforePaise);
      const balanceAfter = this.toRupees(balanceAfterPaise);

      const txId = `WTX_CR_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const reference = externalRef || `WLT-CR-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date().toISOString();

      // 5. Update wallet balance
      this.db.execute(`
        UPDATE wallets 
        SET balance_paise = ?, updated_at = ? 
        WHERE id = ?
      `, [balanceAfterPaise, now, wallet.id]);

      // 6. Post immutable ledger record
      this.db.execute(`
        INSERT INTO wallet_transactions (
          id, wallet_id, user_id, business_id, user_name, user_type, type, category,
          amount, amount_paise, balance_before, balance_before_paise, balance_after, balance_after_paise,
          reference, reason, admin_id, admin_remarks, idempotency_key, correlation_id, status, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 'CREDIT', ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, 'SUCCESS', ?
        )
      `, [
        txId, wallet.id, userId, wallet.business_id, userName, userType, category || "ADMIN_CREDIT",
        this.toRupees(amountPaise), amountPaise, balanceBefore, balanceBeforePaise, balanceAfter, balanceAfterPaise,
        reference, reason.trim(), adminId, adminRemarks || null, idempotencyKey || null, `CORR_${txId}`, now
      ]);

      // 7. Enqueue durable outbox event atomically for WALLET_CREDITED
      try {
        const outboxId = `outbox_${txId}`;
        const outboxIdempotency = `evt_wallet_credited_${txId}`;
        const walletUrl = userType === "MERCHANT" ? "/vendor/wallet" : "/account?tab=wallet";
        const templateVars = {
          user_name: userName,
          wallet_type: userType === "MERCHANT" ? "Business Partner" : "Customer",
          amount: this.toRupees(amountPaise).toFixed(2),
          currency: "INR",
          transaction_reference: reference,
          transaction_date: new Date(now).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          transaction_type: "CREDIT",
          reason: reason.trim(),
          available_balance: balanceAfter.toFixed(2),
          wallet_url: walletUrl,
        };

        const { title: inAppTitle, body: inAppBody } = this.renderPushTemplate("WALLET_CREDITED", templateVars);

        this.db.execute(`
          INSERT OR IGNORE INTO notification_outbox (
            id, idempotency_key, event_type, recipient_id, recipient_role, recipient_phone, recipient_email,
            channel, category, title, message, payload, status, created_at, updated_at
          ) VALUES (?, ?, 'WALLET_CREDITED', ?, ?, ?, ?, 'ALL', 'ACCOUNT_FINANCIAL_ACTIVITY', ?, ?, ?, 'QUEUED', ?, ?)
        `, [
          outboxId,
          outboxIdempotency,
          userId,
          userType === "MERCHANT" ? "VENDOR_OWNER" : "CUSTOMER",
          user?.phone_number || null,
          user?.email || null,
          inAppTitle,
          inAppBody,
          JSON.stringify({
            walletId: wallet.id,
            transactionId: txId,
            reference,
            amount: this.toRupees(amountPaise),
            amountPaise,
            balanceAfter,
            balanceAfterPaise,
            userType,
            reason: reason.trim(),
            adminId,
            walletUrl,
          }),
          now,
          now
        ]);

        const notifId = `notif_wlt_${txId}`;
        this.db.execute(`
          INSERT OR IGNORE INTO notifications (
            id, title, message, type, recipient, is_read, related_entity, related_id, created_at
          ) VALUES (?, ?, ?, 'WALLET_TRANSACTION', ?, 0, 'wallet_transactions', ?, ?)
        `, [
          notifId,
          inAppTitle,
          inAppBody,
          userType === "MERCHANT" ? "MERCHANT" : (user?.phone_number || userId),
          txId,
          now
        ]);

        if (user?.email) {
          this.dispatchWalletEmail("WALLET_CREDITED", user.email, templateVars);
        }
      } catch (err: any) {
        console.warn("[WalletLedgerService] Outbox insertion warning:", err?.message);
      }
      const freshTx = this.db.queryOne<any>("SELECT * FROM wallet_transactions WHERE id = ?", [txId]);
      const updatedWallet = this.getOrCreateWallet(userId, userType, businessId);

      return {
        transaction: {
          ...freshTx,
          amount: this.toRupees(freshTx.amount_paise || this.toPaise(freshTx.amount)),
          balance_before: this.toRupees(freshTx.balance_before_paise || 0),
          balance_after: this.toRupees(freshTx.balance_after_paise || this.toPaise(freshTx.balance_after)),
        },
        wallet: updatedWallet,
      };
    });
  }

  /**
   * Atomically post an authorized Debit transaction into the immutable financial ledger.
   * Never permits overdraft / negative balances.
   */
  public debitWallet(input: CreditDebitInput): { transaction: WalletTransactionRecord; wallet: WalletRecord } {
    const { userId, userType, amount, category, reason, adminId, adminRemarks, idempotencyKey, externalRef, businessId } = input;

    if (!amount || amount <= 0) {
      throw new BadRequestException("Debit amount must be greater than zero");
    }
    if (!reason || !reason.trim()) {
      throw new BadRequestException("Mandatory adjustment reason is required for debit");
    }

    const amountPaise = this.toPaise(amount);

    return this.db.transaction(() => {
      // 1. Idempotency check: if already processed, return stored transaction immediately
      if (idempotencyKey) {
        const existingTx = this.db.queryOne<any>(
          "SELECT * FROM wallet_transactions WHERE idempotency_key = ?",
          [idempotencyKey]
        );
        if (existingTx) {
          const currentWallet = this.getOrCreateWallet(userId, userType, businessId);
          return {
            transaction: {
              ...existingTx,
              amount: this.toRupees(existingTx.amount_paise || this.toPaise(existingTx.amount)),
              balance_before: this.toRupees(existingTx.balance_before_paise || 0),
              balance_after: this.toRupees(existingTx.balance_after_paise || this.toPaise(existingTx.balance_after)),
            },
            wallet: currentWallet,
          };
        }
      }

      // 2. Fetch or provision wallet
      const wallet = this.getOrCreateWallet(userId, userType, businessId);

      if (wallet.status === "FROZEN") {
        throw new ForbiddenException("Wallet is currently frozen. Cannot process debit operations.");
      }

      const balanceBeforePaise = Number(wallet.balance_paise || 0);

      // 3. Prevent overdraft
      if (balanceBeforePaise < amountPaise) {
        throw new BadRequestException(
          `Insufficient wallet balance. Available: ₹${this.toRupees(balanceBeforePaise).toFixed(2)}, Requested Debit: ₹${this.toRupees(amountPaise).toFixed(2)}`
        );
      }

      // 4. User details for readable ledger description
      const user = this.db.queryOne<any>("SELECT full_name, phone_number, email FROM users WHERE id = ?", [userId]);
      const userName = user?.full_name || (userType === "MERCHANT" ? "Business Partner" : "Customer");

      // 5. Calculate new balances in integer paise
      const balanceAfterPaise = balanceBeforePaise - amountPaise;
      const balanceBefore = this.toRupees(balanceBeforePaise);
      const balanceAfter = this.toRupees(balanceAfterPaise);

      const txId = `WTX_DB_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const reference = externalRef || `WLT-DB-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date().toISOString();

      // 6. Update wallet balance
      this.db.execute(`
        UPDATE wallets 
        SET balance_paise = ?, updated_at = ? 
        WHERE id = ?
      `, [balanceAfterPaise, now, wallet.id]);

      // 7. Post immutable ledger record
      this.db.execute(`
        INSERT INTO wallet_transactions (
          id, wallet_id, user_id, business_id, user_name, user_type, type, category,
          amount, amount_paise, balance_before, balance_before_paise, balance_after, balance_after_paise,
          reference, reason, admin_id, admin_remarks, idempotency_key, correlation_id, status, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, 'DEBIT', ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, 'SUCCESS', ?
        )
      `, [
        txId, wallet.id, userId, wallet.business_id, userName, userType, category || "ADMIN_DEBIT",
        this.toRupees(amountPaise), amountPaise, balanceBefore, balanceBeforePaise, balanceAfter, balanceAfterPaise,
        reference, reason.trim(), adminId, adminRemarks || null, idempotencyKey || null, `CORR_${txId}`, now
      ]);

      // 8. Enqueue durable outbox event atomically for WALLET_DEBITED
      try {
        const outboxId = `outbox_${txId}`;
        const outboxIdempotency = `evt_wallet_debited_${txId}`;
        const walletUrl = userType === "MERCHANT" ? "/vendor/wallet" : "/account?tab=wallet";
        const templateVars = {
          user_name: userName,
          wallet_type: userType === "MERCHANT" ? "Business Partner" : "Customer",
          amount: this.toRupees(amountPaise).toFixed(2),
          currency: "INR",
          transaction_reference: reference,
          transaction_date: new Date(now).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
          transaction_type: "DEBIT",
          reason: reason.trim(),
          available_balance: balanceAfter.toFixed(2),
          wallet_url: walletUrl,
        };

        const { title: inAppTitle, body: inAppBody } = this.renderPushTemplate("WALLET_DEBITED", templateVars);

        this.db.execute(`
          INSERT OR IGNORE INTO notification_outbox (
            id, idempotency_key, event_type, recipient_id, recipient_role, recipient_phone, recipient_email,
            channel, category, title, message, payload, status, created_at, updated_at
          ) VALUES (?, ?, 'WALLET_DEBITED', ?, ?, ?, ?, 'ALL', 'ACCOUNT_FINANCIAL_ACTIVITY', ?, ?, ?, 'QUEUED', ?, ?)
        `, [
          outboxId,
          outboxIdempotency,
          userId,
          userType === "MERCHANT" ? "VENDOR_OWNER" : "CUSTOMER",
          user?.phone_number || null,
          user?.email || null,
          inAppTitle,
          inAppBody,
          JSON.stringify({
            walletId: wallet.id,
            transactionId: txId,
            reference,
            amount: this.toRupees(amountPaise),
            amountPaise,
            balanceAfter,
            balanceAfterPaise,
            userType,
            reason: reason.trim(),
            adminId,
            walletUrl,
          }),
          now,
          now
        ]);

        const notifId = `notif_wlt_${txId}`;
        this.db.execute(`
          INSERT OR IGNORE INTO notifications (
            id, title, message, type, recipient, is_read, related_entity, related_id, created_at
          ) VALUES (?, ?, ?, 'WALLET_TRANSACTION', ?, 0, 'wallet_transactions', ?, ?)
        `, [
          notifId,
          inAppTitle,
          inAppBody,
          userType === "MERCHANT" ? "MERCHANT" : (user?.phone_number || userId),
          txId,
          now
        ]);

        if (user?.email) {
          this.dispatchWalletEmail("WALLET_DEBITED", user.email, templateVars);
        }
      } catch (err: any) {
        console.warn("[WalletLedgerService] Outbox insertion warning:", err?.message);
      }
      const freshTx = this.db.queryOne<any>("SELECT * FROM wallet_transactions WHERE id = ?", [txId]);
      const updatedWallet = this.getOrCreateWallet(userId, userType, businessId);

      return {
        transaction: {
          ...freshTx,
          amount: this.toRupees(freshTx.amount_paise || this.toPaise(freshTx.amount)),
          balance_before: this.toRupees(freshTx.balance_before_paise || 0),
          balance_after: this.toRupees(freshTx.balance_after_paise || this.toPaise(freshTx.balance_after)),
        },
        wallet: updatedWallet,
      };
    });
  }

  /**
   * Set wallet status (e.g. FROZEN or ACTIVE) with audit reason.
   */
  public setWalletStatus(walletId: string, status: "ACTIVE" | "FROZEN", adminId: string, reason: string): WalletRecord {
    const wallet = this.db.queryOne<any>("SELECT * FROM wallets WHERE id = ?", [walletId]);
    if (!wallet) throw new NotFoundException(`Wallet '${walletId}' not found`);

    const now = new Date().toISOString();
    this.db.execute("UPDATE wallets SET status = ?, updated_at = ? WHERE id = ?", [status, now, walletId]);

    // Insert into audit logs
    try {
      this.db.execute(`
        INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, 'WALLET', ?, ?, ?)
      `, [
        `audit_wlt_${Date.now()}`,
        adminId,
        status === "FROZEN" ? "FREEZE_WALLET" : "UNFREEZE_WALLET",
        walletId,
        JSON.stringify({ previousStatus: wallet.status, newStatus: status, reason }),
        now
      ]);
    } catch {}

    const updated = this.db.queryOne<any>("SELECT * FROM wallets WHERE id = ?", [walletId]);
    return {
      ...updated,
      balance: this.toRupees(updated.balance_paise || 0),
    };
  }

  /**
   * Get paginated transactions for a specific user and role context.
   */
  public getUserTransactions(userId: string, userType: "CUSTOMER" | "MERCHANT", options: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    search?: string;
    category?: string;
  }) {
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = Math.max(1, Math.min(100, Number(options.pageSize || 10)));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ["(user_id = ? OR wallet_id IN (SELECT id FROM wallets WHERE user_id = ? AND user_type = ?))"];
    const params: any[] = [userId, userId, userType];

    if (options.type && options.type !== "ALL") {
      conditions.push("type = ?");
      params.push(options.type.toUpperCase());
    }
    if (options.status && options.status !== "ALL") {
      conditions.push("status = ?");
      params.push(options.status.toUpperCase());
    }
    if (options.category && options.category !== "ALL") {
      conditions.push("category = ?");
      params.push(options.category.toUpperCase());
    }
    if (options.search && options.search.trim()) {
      conditions.push("(reference LIKE ? OR reason LIKE ? OR id LIKE ?)");
      const term = `%${options.search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.join(" AND ");

    const countRow = this.db.queryOne<any>(
      `SELECT COUNT(*) as total FROM wallet_transactions WHERE ${whereClause}`,
      params
    );
    const total = countRow?.total || 0;

    const rows = this.db.query<any>(
      `SELECT * FROM wallet_transactions WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const data = rows.map((r) => ({
      ...r,
      amount: this.toRupees(r.amount_paise || this.toPaise(r.amount)),
      balance_before: this.toRupees(r.balance_before_paise || 0),
      balance_after: this.toRupees(r.balance_after_paise || this.toPaise(r.balance_after)),
    }));

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get wallet summary stats for a user (Total Added, Total Spent, Total Rewards, Last Transaction).
   */
  public getWalletSummary(userId: string, userType: "CUSTOMER" | "MERCHANT") {
    const wallet = this.getOrCreateWallet(userId, userType);

    const stats = this.db.queryOne<any>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'CREDIT' AND status = 'SUCCESS' THEN amount_paise ELSE 0 END), 0) as total_added_paise,
        COALESCE(SUM(CASE WHEN type = 'DEBIT' AND status = 'SUCCESS' THEN amount_paise ELSE 0 END), 0) as total_spent_paise,
        COALESCE(SUM(CASE WHEN category = 'REWARD' AND status = 'SUCCESS' THEN amount_paise ELSE 0 END), 0) as total_rewards_paise
      FROM wallet_transactions
      WHERE wallet_id = ?
    `, [wallet.id]);

    const lastTx = this.db.queryOne<any>(`
      SELECT * FROM wallet_transactions
      WHERE wallet_id = ?
      ORDER BY created_at DESC LIMIT 1
    `, [wallet.id]);

    return {
      balance: wallet.balance,
      balancePaise: wallet.balance_paise,
      currency: "INR",
      status: wallet.status,
      totalAdded: this.toRupees(stats?.total_added_paise || 0),
      totalSpent: this.toRupees(stats?.total_spent_paise || 0),
      totalRewards: this.toRupees(stats?.total_rewards_paise || 0),
      lastTransaction: lastTx ? {
        id: lastTx.id,
        type: lastTx.type,
        amount: this.toRupees(lastTx.amount_paise || this.toPaise(lastTx.amount)),
        createdAt: lastTx.created_at,
        reference: lastTx.reference,
        status: lastTx.status,
      } : null,
    };
  }

  /**
   * Central Super Admin wallet transactions query with filters and stats.
   */
  public getAdminWalletTransactions(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    status?: string;
    userType?: string;
    userId?: string;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize || 10)));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ["1=1"];
    const params: any[] = [];

    if (query.userId) {
      conditions.push("(user_id = ? OR wallet_id IN (SELECT id FROM wallets WHERE user_id = ?))");
      params.push(query.userId, query.userId);
    }
    if (query.type && query.type !== "ALL") {
      conditions.push("type = ?");
      params.push(query.type.toUpperCase());
    }
    if (query.status && query.status !== "ALL") {
      conditions.push("status = ?");
      params.push(query.status.toUpperCase());
    }
    if (query.userType && query.userType !== "ALL") {
      conditions.push("user_type = ?");
      params.push(query.userType.toUpperCase());
    }
    if (query.search && query.search.trim()) {
      conditions.push("(user_name LIKE ? OR reference LIKE ? OR wallet_id LIKE ? OR id LIKE ?)");
      const term = `%${query.search.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereClause = conditions.join(" AND ");

    const countRow = this.db.queryOne<any>(
      `SELECT COUNT(*) as total FROM wallet_transactions WHERE ${whereClause}`,
      params
    );
    const total = countRow?.total || 0;

    const rows = this.db.query<any>(
      `SELECT * FROM wallet_transactions WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const stats = this.db.queryOne<any>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'CREDIT' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) as total_recharges,
        COALESCE(SUM(CASE WHEN type = 'DEBIT' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) as credits_consumed,
        COUNT(*) as total_transactions
      FROM wallet_transactions
    `);

    const data = rows.map((r) => ({
      id: r.id,
      wallet_id: r.wallet_id,
      user_id: r.user_id,
      business_id: r.business_id,
      user_name: r.user_name,
      user_type: r.user_type,
      type: r.type,
      category: r.category || "GENERAL",
      amount: this.toRupees(r.amount_paise || this.toPaise(r.amount)),
      balance_after: this.toRupees(r.balance_after_paise || this.toPaise(r.balance_after)),
      reference: r.reference,
      reason: r.reason,
      admin_id: r.admin_id,
      status: r.status,
      created_at: r.created_at,
    }));

    return {
      data,
      stats: {
        totalRecharges: Number((stats?.total_recharges || 0).toFixed(2)),
        creditsConsumed: Number((stats?.credits_consumed || 0).toFixed(2)),
        totalTransactions: stats?.total_transactions || 0,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Financial Safeguard B: Rejection of physical deletion on financial ledger records.
   * Ledger entries are permanent and immutable.
   */
  public bulkDeleteTransactions(ids: string[]) {
    throw new ForbiddenException(
      "Financial Safeguard: Physical deletion of posted financial ledger transactions is prohibited. Use audited reversals instead."
    );
  }

  public deleteTransaction(id: string) {
    throw new ForbiddenException(
      "Financial Safeguard: Physical deletion of posted financial ledger transactions is prohibited. Use audited reversals instead."
    );
  }
}
