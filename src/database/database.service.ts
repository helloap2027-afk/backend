import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { DatabaseSync, ensureSqlJs } from "../types/sqlite-compat";
import * as path from "node:path";
import * as fs from "node:fs";
import * as crypto from "node:crypto";
import * as mysql from "mysql2/promise";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db!: DatabaseSync;
  private dbPath: string = "";
  private mysqlPool: mysql.Pool | null = null;

  async onModuleInit() {
    await ensureSqlJs();
    this.initDatabase();
    await this.initMySQL();
  }

  async onModuleDestroy() {
    if (this.db) {
      this.db.close();
    }
    if (this.mysqlPool) {
      await this.mysqlPool.end().catch(() => {});
    }
  }

  private async initMySQL() {
    try {
      this.mysqlPool = mysql.createPool({
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        database: "hello_db",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      console.log("[DatabaseService] Connected to XAMPP MySQL (hello_db) on port 3306");
    } catch (err: any) {
      console.warn("[DatabaseService] Could not connect to XAMPP MySQL:", err?.message || err);
    }
  }

  public initDatabase(inMemory = false) {
    if (inMemory) {
      this.db = new DatabaseSync(":memory:");
    } else {
      const dataDir = path.resolve(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.dbPath = path.join(dataDir, "hello_dev.db");
      this.db = new DatabaseSync(this.dbPath);
    }

    // Enable foreign keys
    this.db.exec("PRAGMA foreign_keys = ON;");

    this.createTables();
    this.seedDefaults();
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone_number TEXT UNIQUE NOT NULL,
        full_name TEXT,
        email TEXT UNIQUE,
        avatar_url TEXT,
        password_hash TEXT,
        preferred_language TEXT DEFAULT 'English',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        phone_verified_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        refresh_token_hash TEXT NOT NULL,
        device_info TEXT,
        ip_address TEXT,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS otp_challenges (
        id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL,
        otp_code_hash TEXT NOT NULL,
        attempts_count INTEGER NOT NULL DEFAULT 0,
        purpose TEXT NOT NULL DEFAULT 'LOGIN',
        expires_at TEXT NOT NULL,
        verified_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS user_permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        resource_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS admin_preferences (
        user_id TEXT PRIMARY KEY,
        language TEXT DEFAULT 'English',
        email_notifications INTEGER DEFAULT 1,
        sms_alerts INTEGER DEFAULT 1,
        two_factor_auth INTEGER DEFAULT 0,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS states (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS districts (
        id TEXT PRIMARY KEY,
        state_id TEXT NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS cities (
        id TEXT PRIMARY KEY,
        district_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS localities (
        id TEXT PRIMARY KEY,
        city_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        pincode TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        icon_name TEXT,
        meta_title TEXT,
        meta_description TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        legal_name TEXT,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        primary_phone TEXT NOT NULL,
        whatsapp_number TEXT,
        support_email TEXT,
        logo_url TEXT,
        cover_image_url TEXT,
        status TEXT NOT NULL DEFAULT 'APPROVED',
        is_verified INTEGER NOT NULL DEFAULT 0,
        verified_at TEXT,
        is_featured INTEGER NOT NULL DEFAULT 0,
        average_rating REAL NOT NULL DEFAULT 0.0,
        total_reviews INTEGER NOT NULL DEFAULT 0,
        total_enquiries INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS business_owners (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        ownership_type TEXT NOT NULL DEFAULT 'FOUNDER',
        is_primary INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(business_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS business_staff (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'STAFF',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(business_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS business_locations (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        city_id TEXT NOT NULL,
        locality_id TEXT,
        address_line1 TEXT NOT NULL,
        landmark TEXT,
        pincode TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT,
        FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS business_categories (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(business_id, category_id)
      );

      CREATE TABLE IF NOT EXISTS business_hours (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        opens_at TEXT,
        closes_at TEXT,
        is_closed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        UNIQUE(business_id, day_of_week)
      );

      CREATE TABLE IF NOT EXISTS business_media (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        media_url TEXT NOT NULL,
        media_type TEXT NOT NULL DEFAULT 'IMAGE',
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS enquiries (
        id TEXT PRIMARY KEY,
        reference_no TEXT UNIQUE NOT NULL,
        business_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'NEW',
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS enquiry_events (
        id TEXT PRIMARY KEY,
        enquiry_id TEXT NOT NULL,
        actor_user_id TEXT,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        review_text TEXT,
        status TEXT NOT NULL DEFAULT 'APPROVED',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS saved_businesses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        business_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        UNIQUE(user_id, business_id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT,
        action TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload_before TEXT,
        payload_after TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
      );

      -- Index definitions for high-performance lookups
      CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_challenges(phone_number);
      CREATE INDEX IF NOT EXISTS idx_sessions_hash ON user_sessions(refresh_token_hash);
      CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);
      CREATE INDEX IF NOT EXISTS idx_localities_city ON localities(city_id, slug);
      CREATE INDEX IF NOT EXISTS idx_localities_pin ON localities(pincode);
      CREATE INDEX IF NOT EXISTS idx_biz_status ON businesses(status, is_verified);
      CREATE INDEX IF NOT EXISTS idx_cat_slug ON categories(slug);
      CREATE INDEX IF NOT EXISTS idx_enquiries_customer ON enquiries(customer_id);
      CREATE INDEX IF NOT EXISTS idx_enquiries_business ON enquiries(business_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
      -- CMS Module Isolated Relational Schema
      CREATE TABLE IF NOT EXISTS cms_pages (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        title TEXT NOT NULL,
        short_description TEXT,
        content TEXT NOT NULL DEFAULT '',
        faq_items_json TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        visibility TEXT NOT NULL DEFAULT 'PUBLIC',
        published_revision_id TEXT,
        meta_title TEXT,
        meta_description TEXT,
        canonical_url TEXT,
        robots_index INTEGER NOT NULL DEFAULT 1,
        og_title TEXT,
        og_description TEXT,
        og_image TEXT,
        created_by TEXT NOT NULL DEFAULT 'Super Admin',
        updated_by TEXT NOT NULL DEFAULT 'Super Admin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(slug, language)
      );

      CREATE TABLE IF NOT EXISTS cms_revisions (
        id TEXT PRIMARY KEY,
        page_id TEXT NOT NULL,
        page_slug TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        revision_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        short_description TEXT,
        content TEXT NOT NULL DEFAULT '',
        faq_items_json TEXT,
        seo_json TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        change_summary TEXT,
        created_by TEXT NOT NULL DEFAULT 'Super Admin',
        created_at TEXT NOT NULL,
        FOREIGN KEY (page_id) REFERENCES cms_pages(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cms_audit_logs (
        id TEXT PRIMARY KEY,
        page_slug TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'en',
        action TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT,
        performed_by TEXT NOT NULL DEFAULT 'Super Admin',
        performed_by_role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
        details TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contact_submissions (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'NEW',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cms_page_lookup ON cms_pages(slug, language);
      CREATE INDEX IF NOT EXISTS idx_cms_rev_page ON cms_revisions(page_id, revision_number);
      CREATE INDEX IF NOT EXISTS idx_cms_audit_slug ON cms_audit_logs(page_slug, timestamp);

      -- =========================================================================
      -- PAYMENTS MODULE SCHEMA
      -- =========================================================================
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        transaction_ref TEXT UNIQUE NOT NULL,
        payer_name TEXT NOT NULL,
        payer_email TEXT,
        payer_type TEXT NOT NULL DEFAULT 'MERCHANT',
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        gateway_ref TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_txn ON payments(transaction_ref);
      CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);

      -- =========================================================================
      -- SUBSCRIPTIONS MODULE SCHEMA
      -- =========================================================================
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        billing_interval TEXT NOT NULL DEFAULT 'MONTHLY',
        features TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        subscriber_name TEXT NOT NULL,
        subscriber_email TEXT,
        subscriber_phone TEXT,
        plan_id TEXT NOT NULL,
        plan_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        start_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        auto_renew INTEGER NOT NULL DEFAULT 1,
        payment_status TEXT NOT NULL DEFAULT 'PAID',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
      );
      CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_sub_plan ON subscriptions(plan_id);
      CREATE INDEX IF NOT EXISTS idx_sub_expiry ON subscriptions(expiry_date);

      -- =========================================================================
      -- NOTIFICATIONS MODULE SCHEMA
      -- =========================================================================
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'KYC_VERIFICATION',
        recipient TEXT NOT NULL DEFAULT 'Super Admin',
        is_read INTEGER NOT NULL DEFAULT 0,
        related_entity TEXT,
        related_id TEXT,
        created_at TEXT NOT NULL,
        read_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);

      
      -- =========================================================================
      -- WALLET TRANSACTIONS & WITHDRAWALS SCHEMA
      -- =========================================================================
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        wallet_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_type TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        balance_after REAL NOT NULL,
        reference TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
        id TEXT PRIMARY KEY,
        merchant_id TEXT NOT NULL,
        merchant_name TEXT NOT NULL,
        amount REAL NOT NULL,
        bank_account TEXT NOT NULL,
        ifsc_code TEXT NOT NULL,
        status TEXT NOT NULL,
        payout_ref TEXT,
        requested_at TEXT NOT NULL,
        processed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS auth_mfa_challenges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        verified_at TEXT,
        attempts_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    
      CREATE TABLE IF NOT EXISTS ad_campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ad_title TEXT NOT NULL,
        notification_title TEXT NOT NULL,
        notification_body TEXT NOT NULL,
        subtitle TEXT,
        banner_url TEXT,
        category TEXT,
        priority TEXT DEFAULT 'NORMAL',
        target_audience TEXT DEFAULT 'ALL',
        target_city TEXT DEFAULT 'All',
        target_locality TEXT,
        destination_type TEXT DEFAULT 'APP_SCREEN',
        destination_url TEXT,
        scheduled_at TEXT,
        status TEXT DEFAULT 'DRAFT',
        target_count INTEGER DEFAULT 0,
        eligible_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        created_by TEXT DEFAULT 'Super Admin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        terms TEXT,
        banner_url TEXT,
        category TEXT DEFAULT 'All',
        discount_type TEXT NOT NULL,
        discount_value REAL NOT NULL,
        min_order_value REAL DEFAULT 0,
        max_discount REAL DEFAULT 0,
        usage_limit INTEGER DEFAULT 1000,
        per_user_limit INTEGER DEFAULT 1,
        redemption_count INTEGER DEFAULT 0,
        applicable_city TEXT DEFAULT 'All',
        applicable_category TEXT DEFAULT 'All',
        valid_from TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        created_by TEXT DEFAULT 'Super Admin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id TEXT PRIMARY KEY,
        coupon_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        order_value REAL NOT NULL,
        discount_applied REAL NOT NULL,
        order_reference TEXT,
        redeemed_at TEXT NOT NULL,
        FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS in_app_notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT DEFAULT 'ANNOUNCEMENT',
        banner_url TEXT,
        target_audience TEXT DEFAULT 'ALL',
        target_city TEXT DEFAULT 'All',
        destination_url TEXT,
        priority TEXT DEFAULT 'NORMAL',
        scheduled_at TEXT,
        expires_at TEXT,
        status TEXT DEFAULT 'PUBLISHED',
        read_count INTEGER DEFAULT 0,
        created_by TEXT DEFAULT 'Super Admin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS push_templates (
        id TEXT PRIMARY KEY,
        event_type TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        title_template TEXT NOT NULL,
        body_template TEXT NOT NULL,
        destination_url TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS normal_push_logs (
        id TEXT PRIMARY KEY,
        notification_ref TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        recipient_type TEXT NOT NULL,
        recipient_id TEXT,
        recipient_phone TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        destination_url TEXT,
        delivery_status TEXT NOT NULL DEFAULT 'DELIVERED',
        error_reason TEXT,
        created_at TEXT NOT NULL,
        sent_at TEXT NOT NULL
      );

`);

    // Safe dynamic column migrations for existing SQLite databases
    try {
      this.db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
    } catch {}
    try {
      this.db.exec("ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'English';");
    } catch {}
    try {
      this.db.exec("ALTER TABLE users ADD COLUMN locality_id TEXT;");
    } catch {}
  }

  private seedDefaults() {
    const now = new Date().toISOString();

    // 1. Roles
    const rolesCount = this.db.prepare("SELECT COUNT(*) as count FROM roles").get() as { count: number };
    if (rolesCount.count === 0) {
      const insertRole = this.db.prepare("INSERT INTO roles (id, name, description) VALUES (?, ?, ?)");
      insertRole.run("role-cust", "CUSTOMER", "Consumer discovering local businesses and sending leads");
      insertRole.run("role-owner", "VENDOR_OWNER", "Business owner with full rights over business profiles and staff");
      insertRole.run("role-staff", "VENDOR_STAFF", "Business staff managing assigned leads");
      insertRole.run("role-superadmin", "SUPER_ADMIN", "Platform root administrative privileges");
    }

    // 1b. Default Super Administrator
    const superAdmin = this.db.prepare("SELECT * FROM users WHERE email = ?").get("admin@hello-hi.in") as any;
    if (!superAdmin) {
      this.db.prepare(`
        INSERT OR IGNORE INTO users (id, phone_number, full_name, email, avatar_url, status, phone_verified_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "usr_super_admin",
        "+919848012345",
        "Admin User",
        "admin@hello-hi.in",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        "ACTIVE",
        now,
        now,
        now
      );
      this.db.prepare(`
        INSERT OR IGNORE INTO user_permissions (id, user_id, role_id)
        VALUES (?, ?, ?)
      `).run("perm-superadmin", "usr_super_admin", "role-superadmin");
      this.db.prepare(`
        INSERT OR IGNORE INTO admin_preferences (user_id, language, email_notifications, sms_alerts, two_factor_auth, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run("usr_super_admin", "English", 1, 1, 0, now);
    }

    // Ensure default Super Admin has scrypt-hashed password
    const adminUser = this.db.prepare("SELECT * FROM users WHERE email = ?").get("admin@hello-hi.in") as any;
    if (adminUser && (!adminUser.password_hash || adminUser.password_hash.trim() === "")) {
      const salt = "4a9b2c8f1e6d3a7c";
      const hash = crypto.scryptSync("admin123", salt, 64).toString("hex");
      this.db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(`${salt}:${hash}`, "admin@hello-hi.in");
    }

    // 2. States, Districts, Cities & Localities (Always ensure AP & TS pilot hubs exist)
    const insertState = this.db.prepare("INSERT OR IGNORE INTO states (id, name, code, is_active) VALUES (?, ?, ?, 1)");
    insertState.run("state-ap", "Andhra Pradesh", "AP");
    insertState.run("state-ts", "Telangana", "TS");

    // Districts
    const insertDistrict = this.db.prepare("INSERT OR IGNORE INTO districts (id, state_id, name) VALUES (?, ?, ?)");
    insertDistrict.run("dist-krishna", "state-ap", "Krishna");
    insertDistrict.run("dist-guntur", "state-ap", "Guntur");
    insertDistrict.run("dist-hyd", "state-ts", "Hyderabad");

    // Cities
    const insertCity = this.db.prepare("INSERT OR IGNORE INTO cities (id, district_id, name, slug, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
    insertCity.run("city-hyd", "dist-hyd", "Hyderabad", "hyderabad", 17.3850, 78.4867);
    insertCity.run("city-vja", "dist-krishna", "Vijayawada", "vijayawada", 16.5062, 80.6480);
    insertCity.run("city-gun", "dist-guntur", "Guntur", "guntur", 16.3067, 80.4365);

    // Localities
    const insertLoc = this.db.prepare("INSERT OR IGNORE INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
    // Hyderabad Localities
    insertLoc.run("loc-hitec", "city-hyd", "Hitec City", "hitec-city", "500081", 17.4435, 78.3772);
    insertLoc.run("loc-banjara", "city-hyd", "Banjara Hills", "banjara-hills", "500034", 17.4156, 78.4357);
    insertLoc.run("loc-jubilee", "city-hyd", "Jubilee Hills", "jubilee-hills", "500033", 17.4319, 78.4073);
    insertLoc.run("loc-gachibowli", "city-hyd", "Gachibowli", "gachibowli", "500032", 17.4401, 78.3489);
    insertLoc.run("loc-madhapur", "city-hyd", "Madhapur", "madhapur", "500081", 17.4483, 78.3915);
    insertLoc.run("loc-kondapur", "city-hyd", "Kondapur", "kondapur", "500084", 17.4699, 78.3578);
    insertLoc.run("loc-kukatpally", "city-hyd", "Kukatpally", "kukatpally", "500072", 17.4933, 78.3995);
    insertLoc.run("loc-secunderabad", "city-hyd", "Secunderabad", "secunderabad", "500003", 17.4399, 78.4983);
    insertLoc.run("loc-begumpet", "city-hyd", "Begumpet", "begumpet", "500016", 17.4447, 78.4664);

    // Vijayawada & Guntur Localities
    insertLoc.run("loc-nahamar", "city-vja", "Nahamar", "nahamar", "520008", 16.5120, 80.6515);
    insertLoc.run("loc-benz", "city-vja", "Benz Circle", "benz-circle", "520010", 16.5015, 80.6430);
    insertLoc.run("loc-onetown", "city-vja", "One Town", "one-town", "520001", 16.5180, 80.6190);
    insertLoc.run("loc-brodipet", "city-gun", "Brodipet", "brodipet", "522002", 16.3050, 80.4380);
    insertLoc.run("loc-arundelpet", "city-gun", "Arundelpet", "arundelpet", "522002", 16.3120, 80.4320);

    // 3. Taxonomies: Categories & Services (Always ensure all 14 master categories exist)
    const insertCat = this.db.prepare(
      "INSERT OR IGNORE INTO categories (id, parent_id, name, slug, icon_name, meta_title, meta_description, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
    );

    // 14 Standard Master Categories matching user specification
    const categoriesList = [
      { id: "cat-restaurants", name: "Restaurants", slug: "restaurants", icon: "UtensilsCrossed", desc: "Authentic dining, biryani, family restaurants and cafes" },
      { id: "cat-hotels", name: "Hotels", slug: "hotels", icon: "Hotel", desc: "Luxury and budget AC hotels, suites, and lodges" },
      { id: "cat-beauty-spa", name: "Beauty Spa", slug: "beauty-spa", icon: "Sparkles", desc: "Salons, bridal makeup, skincare, and wellness spas" },
      { id: "cat-home-decor", name: "Home Decor", slug: "home-decor", icon: "Armchair", desc: "Interior designers, modular kitchens, and home furnishings" },
      { id: "cat-ask-astro", name: "Ask Astro", slug: "ask-astro", icon: "Sparkle", desc: "Vedic astrologers, Vastu consultants, and numerologists" },
      { id: "cat-wedding-planning", name: "Wedding Planning", slug: "wedding-planning", icon: "HeartHandshake", desc: "Kalyana mandapams, decorators, and wedding planners" },
      { id: "cat-education", name: "Education", slug: "education", icon: "GraduationCap", desc: "Top coaching institutes, schools, and tutoring academies" },
      { id: "cat-rent-hire", name: "Rent & Hire", slug: "rent-hire", icon: "Key", desc: "Self-drive cars, generators, equipment, and sound hire" },
      { id: "cat-hospitals", name: "Hospitals", slug: "hospitals", icon: "Hospital", desc: "24/7 multispeciality hospitals and emergency trauma centers" },
      { id: "cat-contractors", name: "Contractors", slug: "contractors", icon: "HardHat", desc: "Civil building contractors and turnkey construction" },
      { id: "cat-pet-shops", name: "Pet Shops", slug: "pet-shops", icon: "PawPrint", desc: "Pet shops, veterinary clinics, and grooming spas" },
      { id: "cat-pg-hostels", name: "PG/Hostels", slug: "pg-hostels", icon: "Bed", desc: "Men's, women's, and working professionals luxury PGs" },
      { id: "cat-estate-agent", name: "Estate Agent", slug: "estate-agent", icon: "Building2", desc: "Real estate brokers, commercial leasing, and flats for sale" },
      { id: "cat-dentists", name: "Dentists", slug: "dentists", icon: "SmilePlus", desc: "Orthodontists, painless root canals, and invisible aligners" },
      // Legacy aliases for backward compatibility
      { id: "cat-food", name: "Restaurants & Dining", slug: "restaurants-food", icon: "UtensilsCrossed", desc: "Dining and biryani" },
      { id: "cat-dental", name: "Dental Care", slug: "dental-care", icon: "SmilePlus", desc: "Dental clinics" },
      { id: "cat-movers", name: "Packers & Movers", slug: "packers-movers", icon: "Truck", desc: "Packers & movers" },
      { id: "cat-electric", name: "Electrical & Plumbing", slug: "electrical-plumbing", icon: "Zap", desc: "Electricians" },
      { id: "cat-home", name: "Home Services", slug: "home-services", icon: "Home", desc: "Home services" },
      { id: "cat-tours", name: "Tours & Travel", slug: "tours-travel", icon: "Plane", desc: "Tours and travel" },
      { id: "cat-doctors", name: "Doctors & Clinics", slug: "doctors-clinics", icon: "Stethoscope", desc: "Doctors" },
    ];

    for (let i = 0; i < categoriesList.length; i++) {
      const c = categoriesList[i];
      insertCat.run(c.id, null, c.name, c.slug, c.icon, `${c.name} in Andhra Pradesh`, c.desc, i + 1);
    }

    // Services
    const insertService = this.db.prepare("INSERT OR IGNORE INTO services (id, category_id, name, slug) VALUES (?, ?, ?, ?)");
    insertService.run("srv-1", "cat-restaurants", "Family Dining", "family-dining");
    insertService.run("srv-2", "cat-restaurants", "Biryani & Tandoor", "biryani-tandoor");
    insertService.run("srv-3", "cat-restaurants", "South Indian Thali", "south-indian-thali");
    insertService.run("srv-4", "cat-hospitals", "General Physician", "general-physician");
    insertService.run("srv-5", "cat-hospitals", "Pediatrician", "pediatrician");
    insertService.run("srv-6", "cat-dentists", "Root Canal Treatment", "root-canal-treatment");
    insertService.run("srv-7", "cat-dentists", "Teeth Whitening", "teeth-whitening");
    insertService.run("srv-8", "cat-dentists", "Dental Implants", "dental-implants");
    insertService.run("srv-9", "cat-rent-hire", "Self-Drive Cars", "self-drive-cars");
    insertService.run("srv-10", "cat-hotels", "AC Business Suites", "ac-business-suites");
    insertService.run("srv-11", "cat-beauty-spa", "Bridal Makeup Studio", "bridal-makeup");
    insertService.run("srv-12", "cat-home-decor", "Modular Kitchens", "modular-kitchens");
    insertService.run("srv-13", "cat-ask-astro", "Vedic Horoscope Reading", "vedic-horoscope");
    insertService.run("srv-14", "cat-wedding-planning", "Kalyana Mandapam AC", "mandapam-ac");
    insertService.run("srv-15", "cat-education", "IIT-JEE / NEET Coaching", "iit-neet-coaching");
    insertService.run("srv-16", "cat-contractors", "Civil Building Construction", "civil-construction");
    insertService.run("srv-17", "cat-pet-shops", "Pet Grooming & Spa", "pet-grooming");
    insertService.run("srv-18", "cat-pg-hostels", "Executive Men's AC PG", "mens-ac-pg");
    insertService.run("srv-19", "cat-estate-agent", "CRDA Open Plots & 3BHK", "crda-open-plots");

    // 4. Default Seed Vendor User (for business ownership integrity)
    let defaultVendor = this.db.prepare("SELECT id FROM users WHERE phone_number = ?").get("+919848099999") as { id: string } | undefined;
    if (!defaultVendor) {
      const vendorId = "user-vendor-pilot";
      this.db.prepare(
        "INSERT INTO users (id, phone_number, full_name, email, status, phone_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)"
      ).run(vendorId, "+919848099999", "Ramesh Kumar (Pilot Partner)", "ramesh.kumar@hello-hi.in", now, now, now);
      this.db.prepare(
        "INSERT INTO user_permissions (id, user_id, role_id) VALUES (?, ?, 'role-owner')"
      ).run("perm-vendor-pilot", vendorId);
      defaultVendor = { id: vendorId };
    }

    // 5. Seed Real Pilot Businesses (All 14 Categories)
    const bizCount = this.db.prepare("SELECT COUNT(*) as count FROM businesses").get() as { count: number };
    if (bizCount.count < 18) {
      const insertBiz = this.db.prepare(`
        INSERT OR IGNORE INTO businesses (
          id, name, legal_name, slug, description, primary_phone, whatsapp_number, support_email,
          logo_url, cover_image_url, status, is_verified, verified_at, is_featured,
          average_rating, total_reviews, total_enquiries, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertBizLoc = this.db.prepare(`
        INSERT OR IGNORE INTO business_locations (
          id, business_id, city_id, locality_id, address_line1, landmark, pincode, latitude, longitude, is_primary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const insertBizCat = this.db.prepare(`
        INSERT OR IGNORE INTO business_categories (id, business_id, category_id, is_primary) VALUES (?, ?, ?, ?)
      `);

      const insertBizOwner = this.db.prepare(`
        INSERT OR IGNORE INTO business_owners (id, business_id, user_id, ownership_type, is_primary) VALUES (?, ?, ?, 'FOUNDER', 1)
      `);

      const insertHour = this.db.prepare(`
        INSERT OR IGNORE INTO business_hours (id, business_id, day_of_week, opens_at, closes_at, is_closed) VALUES (?, ?, ?, ?, ?, ?)
      `);

      // 1. Amravati Grand Restaurant
      insertBiz.run(
        "biz-amravati",
        "Amravati Grand Restaurant",
        "Amravati Hospitality Pvt Ltd",
        "amravati-grand-restaurant",
        "Premier authentic Andhra cuisine, royal thali, aromatic clay-pot biryani, and family fine dining in the heart of Vijayawada.",
        "+919848011111",
        "+919848011111",
        "contact@amravatigrand.in",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        124,
        182,
        now,
        now
      );
      insertBizLoc.run("loc-biz-1", "biz-amravati", "city-vja", "loc-nahamar", "D.No 40-1-28, MG Road, Nahamar", "Near Benz Circle Flyover", "520008", 16.5120, 80.6515);
      insertBizCat.run("bcat-1", "biz-amravati", "cat-food", 1);
      insertBizOwner.run("bown-1", "biz-amravati", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-amr-${day}`, "biz-amravati", day, "10:30", "23:00", 0);
      }

      // 2. Siri Dental Clinic
      insertBiz.run(
        "biz-siri-dental",
        "Siri Dental Clinic",
        "Dr. Siri Healthcare LLP",
        "siri-dental-clinic",
        "Advanced painless laser dentistry, invisible aligners, computerized root canals, and cosmetic dental surgery by renowned specialists.",
        "+919848033333",
        "+919848033333",
        "care@siridental.com",
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        132,
        145,
        now,
        now
      );
      insertBizLoc.run("loc-biz-2", "biz-siri-dental", "city-vja", "loc-nahamar", "Plot 14, 2nd Cross, Nahamar Main Road", "Behind SBI Branch", "520008", 16.5135, 80.6522);
      insertBizCat.run("bcat-2", "biz-siri-dental", "cat-dental", 1);
      insertBizCat.run("bcat-2b", "biz-siri-dental", "cat-doctors", 0);
      insertBizOwner.run("bown-2", "biz-siri-dental", defaultVendor.id);
      for (let day = 1; day <= 6; day++) {
        insertHour.run(`hour-siri-${day}`, "biz-siri-dental", day, "09:00", "21:00", 0);
      }
      insertHour.run("hour-siri-0", "biz-siri-dental", 0, "10:00", "14:00", 0);

      // 3. Fernat Dental Business
      insertBiz.run(
        "biz-fernat-dental",
        "Fernat Dental Business",
        "Fernat Healthcare Services",
        "fernat-dental-business",
        "Modern dental care clinic offering complete oral checkups, scaling, pediatric dental solutions and implants.",
        "+919848044444",
        "+919848044444",
        "info@fernatdental.in",
        "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        0,
        4.8,
        96,
        88,
        now,
        now
      );
      insertBizLoc.run("loc-biz-3", "biz-fernat-dental", "city-vja", "loc-benz", "Opposite Modern Mall, Benz Circle", "MG Road Junction", "520010", 16.5015, 80.6430);
      insertBizCat.run("bcat-3", "biz-fernat-dental", "cat-dental", 1);
      insertBizOwner.run("bown-3", "biz-fernat-dental", defaultVendor.id);
      for (let day = 1; day <= 6; day++) {
        insertHour.run(`hour-fernat-${day}`, "biz-fernat-dental", day, "09:30", "20:30", 0);
      }
      insertHour.run("hour-fernat-0", "biz-fernat-dental", 0, null, null, 1); // Closed on Sundays

      // 4. Srinivasa Packers & Movers
      insertBiz.run(
        "biz-srinivasa-packers",
        "Srinivasa Packers & Movers",
        "Srinivasa Logistics Services",
        "srinivasa-packers-movers",
        "Top-rated packing and moving specialists in Guntur & Vijayawada. Safe household shifting, zero-damage vehicle moving & secure warehousing.",
        "+919848022222",
        "+919848022222",
        "support@srinivasapackers.in",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        89,
        210,
        now,
        now
      );
      insertBizLoc.run("loc-biz-4", "biz-srinivasa-packers", "city-gun", "loc-brodipet", "Shop #7, 4/1 Brodipet Main Road", "Near Old Bus Stand", "522002", 16.3050, 80.4380);
      insertBizCat.run("bcat-4", "biz-srinivasa-packers", "cat-movers", 1);
      insertBizCat.run("bcat-4b", "biz-srinivasa-packers", "cat-home", 0);
      insertBizOwner.run("bown-4", "biz-srinivasa-packers", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-srini-${day}`, "biz-srinivasa-packers", day, "08:00", "22:00", 0);
      }

      // 5. Sri Lakshmi Electrical & Plumbing
      insertBiz.run(
        "biz-sri-lakshmi",
        "Sri Lakshmi Electrical & Plumbing",
        "Sri Lakshmi Technical Works",
        "sri-lakshmi-electrical-plumbing",
        "Certified professional technicians for domestic & industrial house wiring, inverter setups, bathroom fitting and pipe repairs.",
        "+919848055555",
        "+919848055555",
        "lakshmitechnical@hello-hi.in",
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        0,
        4.9,
        142,
        176,
        now,
        now
      );
      insertBizLoc.run("loc-biz-5", "biz-sri-lakshmi", "city-vja", "loc-onetown", "Kaleswara Rao Market Street, One Town", "Near Kanaka Durga Temple Arch", "520001", 16.5180, 80.6190);
      insertBizCat.run("bcat-5", "biz-sri-lakshmi", "cat-electric", 1);
      insertBizCat.run("bcat-5b", "biz-sri-lakshmi", "cat-home", 0);
      insertBizOwner.run("bown-5", "biz-sri-lakshmi", defaultVendor.id);
      for (let day = 1; day <= 6; day++) {
        insertHour.run(`hour-laks-${day}`, "biz-sri-lakshmi", day, "08:30", "21:00", 0);
      }
      insertHour.run("hour-laks-0", "biz-sri-lakshmi", 0, "09:00", "14:00", 0);

      // 6. Balaji Tours & Travel AP
      insertBiz.run(
        "biz-balaji-tours",
        "Balaji Tours & Travel AP",
        "Balaji Travels Andhra Pradesh",
        "balaji-tours-travel-ap",
        "Complete travel solutions across Andhra Pradesh: Tirupati packages, Vijayawada to Hyderabad airport cabs, and luxury coach rentals.",
        "+919848066666",
        "+919848066666",
        "bookings@balajitravelsap.com",
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        0,
        4.7,
        64,
        92,
        now,
        now
      );
      insertBizLoc.run("loc-biz-6", "biz-balaji-tours", "city-gun", "loc-arundelpet", "Complex B-4, 7th Line, Arundelpet", "Near Shankar Vilas Centre", "522002", 16.3120, 80.4320);
      insertBizCat.run("bcat-6", "biz-balaji-tours", "cat-tours", 1);
      insertBizCat.run("bcat-6b", "biz-balaji-tours", "cat-rent-hire", 0);
      insertBizOwner.run("bown-6", "biz-balaji-tours", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-balaji-${day}`, "biz-balaji-tours", day, "06:00", "23:00", 0);
      }

      // Also link pilot businesses to exact slug categories
      insertBizCat.run("bcat-1b", "biz-amravati", "cat-restaurants", 0);
      insertBizCat.run("bcat-2c", "biz-siri-dental", "cat-dentists", 0);
      insertBizCat.run("bcat-3b", "biz-fernat-dental", "cat-dentists", 0);
      insertBizCat.run("bcat-4c", "biz-srinivasa-packers", "cat-rent-hire", 0);
      insertBizCat.run("bcat-5c", "biz-sri-lakshmi", "cat-contractors", 0);

      // 7. Novotel Varun Hotel & Suites (Hotels)
      insertBiz.run(
        "biz-novotel-vja",
        "Novotel Varun Hotel & Suites",
        "Varun Hospitality Group Ltd",
        "novotel-varun-hotel-suites",
        "Premier 5-star luxury accommodation with infinity pool, banquet halls, multi-cuisine dining, and airport shuttle service.",
        "+919848077771",
        "+919848077771",
        "reservations@novotelvarun.in",
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.9,
        342,
        410,
        now,
        now
      );
      insertBizLoc.run("loc-biz-7", "biz-novotel-vja", "city-vja", "loc-benz", "Near Benz Circle, MG Road", "Opposite Joyalukkas", "520010", 16.5020, 80.6440);
      insertBizCat.run("bcat-7", "biz-novotel-vja", "cat-hotels", 1);
      insertBizOwner.run("bown-7", "biz-novotel-vja", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-novo-${day}`, "biz-novotel-vja", day, "00:00", "23:59", 0);
      }

      // 8. Lotus Ayurvedic Spa & Bridal Studio (Beauty Spa)
      insertBiz.run(
        "biz-lotus-spa",
        "Lotus Ayurvedic Spa & Bridal Studio",
        "Lotus Wellness & Beauty Pvt Ltd",
        "lotus-spa-bridal-studio",
        "Certified luxury Ayurvedic therapies, rejuvenating body massages, HD bridal makeup, and herbal hair care therapies.",
        "+919848077772",
        "+919848077772",
        "glow@lotusspa.in",
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        112,
        156,
        now,
        now
      );
      insertBizLoc.run("loc-biz-8", "biz-lotus-spa", "city-vja", "loc-nahamar", "Plot 22, Nahamar Ring Road", "Near HDFC Bank", "520008", 16.5110, 80.6500);
      insertBizCat.run("bcat-8", "biz-lotus-spa", "cat-beauty-spa", 1);
      insertBizOwner.run("bown-8", "biz-lotus-spa", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-lotus-${day}`, "biz-lotus-spa", day, "09:00", "20:30", 0);
      }

      // 9. Urban Living Modular Kitchens & Furnishings (Home Decor)
      insertBiz.run(
        "biz-urban-decor",
        "Urban Living Modular Kitchens & Furnishings",
        "Urban Living Interiors LLP",
        "urban-living-modular-kitchens",
        "German hardware modular kitchens, customized wardrobes, wooden flooring, false ceiling, and designer wallpaper installations.",
        "+919848077773",
        "+919848077773",
        "design@urbanlivinginteriors.in",
        "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        78,
        135,
        now,
        now
      );
      insertBizLoc.run("loc-biz-9", "biz-urban-decor", "city-vja", "loc-benz", "39-8-12, Bandar Road, Benz Circle", "Near D-Mart", "520010", 16.5030, 80.6450);
      insertBizCat.run("bcat-9", "biz-urban-decor", "cat-home-decor", 1);
      insertBizOwner.run("bown-9", "biz-urban-decor", defaultVendor.id);
      for (let day = 1; day <= 6; day++) {
        insertHour.run(`hour-urban-${day}`, "biz-urban-decor", day, "10:00", "20:00", 0);
      }

      // 10. Sri Gayatri Vedic Jyothishya & Vastu (Ask Astro)
      insertBiz.run(
        "biz-gayatri-astro",
        "Sri Gayatri Vedic Jyothishya & Vastu",
        "Sri Gayatri Astrological Research Center",
        "sri-gayatri-vedic-jyothishya-vastu",
        "Renowned traditional Vedic scholar with 25+ years experience in horoscope matchmaking, residential Vastu corrections, and muhurtham.",
        "+919848077774",
        "+919848077774",
        "consult@gayatriastro.in",
        "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.9,
        185,
        240,
        now,
        now
      );
      insertBizLoc.run("loc-biz-10", "biz-gayatri-astro", "city-gun", "loc-brodipet", "3rd Line, Brodipet", "Opp. Sivalayam", "522002", 16.3060, 80.4390);
      insertBizCat.run("bcat-10", "biz-gayatri-astro", "cat-ask-astro", 1);
      insertBizOwner.run("bown-10", "biz-gayatri-astro", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-astro-${day}`, "biz-gayatri-astro", day, "08:00", "19:00", 0);
      }

      // 11. Siddhi Vinayaka Kalyana Mandapam (Wedding Planning)
      insertBiz.run(
        "biz-siddhi-weddings",
        "Siddhi Vinayaka Kalyana Mandapam & Event Decor",
        "Siddhi Vinayaka Conventions Pvt Ltd",
        "siddhi-vinayaka-kalyana-mandapam",
        "Air-conditioned convention hall with 1,500 seating capacity, 50 deluxe guest rooms, grand stage decoration, and royal catering.",
        "+919848077775",
        "+919848077775",
        "events@siddhivinayaka.in",
        "https://images.unsplash.com/photo-1519741497674-611481863552?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        94,
        172,
        now,
        now
      );
      insertBizLoc.run("loc-biz-11", "biz-siddhi-weddings", "city-vja", "loc-onetown", "Bypass Road, One Town", "Near Kanakadurga Varadhi", "520001", 16.5170, 80.6200);
      insertBizCat.run("bcat-11", "biz-siddhi-weddings", "cat-wedding-planning", 1);
      insertBizOwner.run("bown-11", "biz-siddhi-weddings", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-wed-${day}`, "biz-siddhi-weddings", day, "07:00", "22:00", 0);
      }

      // 12. Sri Chaitanya & Narayana NEET Academy (Education)
      insertBiz.run(
        "biz-narayana-academy",
        "Sri Chaitanya & Narayana NEET/IIT Academy",
        "Narayana Educational Institutions Ltd",
        "narayana-neet-iit-academy",
        "Premier coaching institution with top state ranks in NEET, JEE Mains & Advanced, with residential campus and expert faculty.",
        "+919848077776",
        "+919848077776",
        "admissions@narayanaacademy.in",
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.7,
        210,
        380,
        now,
        now
      );
      insertBizLoc.run("loc-biz-12", "biz-narayana-academy", "city-vja", "loc-benz", "Gudavalli Road, Near Benz Circle", "Opp. Sub-Collector Office", "520010", 16.5040, 80.6460);
      insertBizCat.run("bcat-12", "biz-narayana-academy", "cat-education", 1);
      insertBizOwner.run("bown-12", "biz-narayana-academy", defaultVendor.id);
      for (let day = 1; day <= 6; day++) {
        insertHour.run(`hour-edu-${day}`, "biz-narayana-academy", day, "08:00", "19:00", 0);
      }

      // 13. Apex Self-Drive Cars & Rentals (Rent & Hire)
      insertBiz.run(
        "biz-apex-rentals",
        "Apex Self-Drive Cars & Equipment Rentals",
        "Apex Mobility Services",
        "apex-self-drive-cars-rentals",
        "Zero-deposit self-drive hatchbacks, SUVs, luxury wedding cars, heavy generator sets, and industrial sound equipment rentals.",
        "+919848077777",
        "+919848077777",
        "bookings@apexrentals.in",
        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        146,
        195,
        now,
        now
      );
      insertBizLoc.run("loc-biz-13", "biz-apex-rentals", "city-gun", "loc-arundelpet", "Main Road, Arundelpet", "Near Old Bus Station", "522002", 16.3130, 80.4330);
      insertBizCat.run("bcat-13", "biz-apex-rentals", "cat-rent-hire", 1);
      insertBizOwner.run("bown-13", "biz-apex-rentals", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-rent-${day}`, "biz-apex-rentals", day, "00:00", "23:59", 0);
      }

      // 14. Ayush Multispeciality 24/7 Hospital (Hospitals)
      insertBiz.run(
        "biz-ayush-hospital",
        "Ayush Multispeciality 24/7 Hospital & Trauma Care",
        "Ayush Healthcare Systems Ltd",
        "ayush-multispeciality-hospital",
        "NABH accredited 200-bed hospital with 24/7 emergency trauma, cardiology, pediatric ICU, orthopedic surgery, and in-house pharmacy.",
        "+919848077778",
        "+919848077778",
        "emergency@ayushhospitals.in",
        "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.9,
        289,
        340,
        now,
        now
      );
      insertBizLoc.run("loc-biz-14", "biz-ayush-hospital", "city-vja", "loc-nahamar", "Ring Road, Nahamar", "Near Government General Hospital", "520008", 16.5140, 80.6530);
      insertBizCat.run("bcat-14", "biz-ayush-hospital", "cat-hospitals", 1);
      insertBizOwner.run("bown-14", "biz-ayush-hospital", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-ayush-${day}`, "biz-ayush-hospital", day, "00:00", "23:59", 0);
      }

      // 15. Amaravati Civil & Turnkey Infrastructure (Contractors)
      insertBiz.run(
        "biz-amaravati-builders",
        "Amaravati Civil & Turnkey Infrastructure Contractors",
        "Amaravati Infra Build Pvt Ltd",
        "amaravati-civil-contractors",
        "Government licensed class-1 civil building contractors, commercial towers, structural waterproofing, borewells, and RCC foundation.",
        "+919848077779",
        "+919848077779",
        "projects@amaravatiinfra.in",
        "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        83,
        110,
        now,
        now
      );
      insertBizLoc.run("loc-biz-15", "biz-amaravati-builders", "city-vja", "loc-benz", "12-4-8, Benz Circle Commercial Hub", "Near Axis Bank", "520010", 16.5010, 80.6420);
      insertBizCat.run("bcat-15", "biz-amaravati-builders", "cat-contractors", 1);
      insertBizOwner.run("bown-15", "biz-amaravati-builders", defaultVendor.id);
      for (let day = 1; day <= 6; day++) {
        insertHour.run(`hour-amrinfra-${day}`, "biz-amaravati-builders", day, "09:00", "19:00", 0);
      }

      // 16. Tail Waggers Pet Boutique & Clinic (Pet Shops)
      insertBiz.run(
        "biz-tail-waggers",
        "Tail Waggers Pet Boutique & Vet Clinic",
        "Tail Waggers Pet Care LLP",
        "tail-waggers-pet-boutique-clinic",
        "Imported pet food, luxury grooming spa, canine vaccinations, pet dental hygiene, and day boarding facilities.",
        "+919848077780",
        "+919848077780",
        "care@tailwaggers.in",
        "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.9,
        67,
        92,
        now,
        now
      );
      insertBizLoc.run("loc-biz-16", "biz-tail-waggers", "city-vja", "loc-nahamar", "Nahamar High Road", "Opposite Reliance Digital", "520008", 16.5125, 80.6510);
      insertBizCat.run("bcat-16", "biz-tail-waggers", "cat-pet-shops", 1);
      insertBizOwner.run("bown-16", "biz-tail-waggers", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-pet-${day}`, "biz-tail-waggers", day, "09:30", "21:00", 0);
      }

      // 17. Sri Sai Deluxe Executive AC Hostel & PG (PG/Hostels)
      insertBiz.run(
        "biz-sai-pg",
        "Sri Sai Deluxe Executive AC Hostel & PG",
        "Sri Sai Hospitality Accommodations",
        "sri-sai-deluxe-executive-pg",
        "High-speed 200Mbps Wi-Fi, 3 times unlimited South Indian meals, biometric 24/7 security, attached AC washrooms, and power backup.",
        "+919848077781",
        "+919848077781",
        "admissions@srisaipg.in",
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        128,
        210,
        now,
        now
      );
      insertBizLoc.run("loc-biz-17", "biz-sai-pg", "city-gun", "loc-brodipet", "5/2 Brodipet Main Road", "Near RVR College Stop", "522002", 16.3070, 80.4370);
      insertBizCat.run("bcat-17", "biz-sai-pg", "cat-pg-hostels", 1);
      insertBizOwner.run("bown-17", "biz-sai-pg", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-pg-${day}`, "biz-sai-pg", day, "05:30", "23:00", 0);
      }

      // 18. Capital City Real Estate & CRDA Plots (Estate Agent)
      insertBiz.run(
        "biz-capital-estate",
        "Capital City Real Estate & CRDA Plots Consultancy",
        "Capital City Properties Pvt Ltd",
        "capital-city-real-estate-crda",
        "Verified CRDA approved open plots, premium 2BHK/3BHK luxury gated apartments, commercial office space leasing, and zero brokerage support.",
        "+919848077782",
        "+919848077782",
        "deals@capitalcityrealestate.in",
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.9,
        174,
        290,
        now,
        now
      );
      insertBizLoc.run("loc-biz-18", "biz-capital-estate", "city-vja", "loc-benz", "Tower B, Level 4, Benz Circle Commercial Complex", "Opposite Novotel", "520010", 16.5018, 80.6435);
      insertBizCat.run("bcat-18", "biz-capital-estate", "cat-estate-agent", 1);
      insertBizOwner.run("bown-18", "biz-capital-estate", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-est-${day}`, "biz-capital-estate", day, "09:00", "20:00", 0);
      }

      // 19. Amnesia Sky Bar & Lakeview Rooftop Lounge (Hyderabad, Hitec City)
      insertBiz.run(
        "biz-amnesia-skybar",
        "Amnesia Sky Bar & Lakeview Rooftop Lounge",
        "Amnesia Hospitality Group Hyderabad",
        "amnesia-sky-bar-lakeview-rooftop-lounge",
        "Continental, Pan-Asian, Cocktails & Lake View. Premium rooftop destination overlooking Durgam Cheruvu lake.",
        "+919848099880",
        "+919848099880",
        "reservations@amnesiaskybar.in",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        980,
        640,
        now,
        now
      );
      insertBizLoc.run("loc-biz-19", "biz-amnesia-skybar", "city-hyd", "loc-hitec", "Level 6, Inorbit Mall Road, Hitec City", "Opp. Durgam Cheruvu Cable Bridge", "500081", 17.4435, 78.3772);
      insertBizCat.run("bcat-19", "biz-amnesia-skybar", "cat-restaurants", 1);
      insertBizOwner.run("bown-19", "biz-amnesia-skybar", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-amnesia-${day}`, "biz-amnesia-skybar", day, "12:00", "23:59", 0);
      }

      // 20. SparkleSmart Electrical Solutions & Home Automation (Hyderabad, Hitec City)
      insertBiz.run(
        "biz-sparklesmart",
        "SparkleSmart Electrical Solutions & Home Automation",
        "SparkleSmart Engineering Services LLP",
        "sparklesmart-electrical-solutions-home-automation",
        "Govt. licensed residential and high-rise IT corridor wiring experts. 24/7 emergency response in Hitec City.",
        "+919848099881",
        "+919848099881",
        "support@sparklesmart.in",
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80",
        "APPROVED",
        1,
        now,
        1,
        4.8,
        340,
        490,
        now,
        now
      );
      insertBizLoc.run("loc-biz-20", "biz-sparklesmart", "city-hyd", "loc-hitec", "Unit 402, Cyber Towers Lane, Hitec City", "Near Cyber Gateway", "500081", 17.4440, 78.3780);
      insertBizCat.run("bcat-20", "biz-sparklesmart", "cat-contractors", 1);
      insertBizOwner.run("bown-20", "biz-sparklesmart", defaultVendor.id);
      for (let day = 0; day <= 6; day++) {
        insertHour.run(`hour-sparkle-${day}`, "biz-sparklesmart", day, "00:00", "23:59", 0);
      }

      // Add Media Gallery for Amravati & Siri Dental
      const insertMedia = this.db.prepare(
        "INSERT OR IGNORE INTO business_media (id, business_id, media_url, media_type, sort_order) VALUES (?, ?, ?, ?, ?)"
      );
      insertMedia.run("med-1", "biz-amravati", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80", "COVER", 1);
      insertMedia.run("med-2", "biz-amravati", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80", "IMAGE", 2);
      insertMedia.run("med-3", "biz-siri-dental", "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80", "COVER", 1);
      insertMedia.run("med-4", "biz-siri-dental", "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80", "IMAGE", 2);

      // Add Customer Reviews
      const insertReview = this.db.prepare(
        "INSERT OR IGNORE INTO reviews (id, business_id, user_id, rating, review_text, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'APPROVED', ?, ?)"
      );
      insertReview.run("rev-1", "biz-amravati", defaultVendor.id, 5, "Unmatched taste in Vijayawada! The clay pot biryani and gongura mutton are outstanding.", now, now);
      insertReview.run("rev-2", "biz-amravati", defaultVendor.id, 5, "Very hygienic and family-friendly ambiance. Great service near Benz Circle.", now, now);
      insertReview.run("rev-3", "biz-siri-dental", defaultVendor.id, 5, "Extremely professional dental clinic. Painless root canal and great equipment.", now, now);
      insertReview.run("rev-4", "biz-srinivasa-packers", defaultVendor.id, 5, "Shifted our 3BHK from Guntur to Vijayawada safely without a single scratch. Highly recommended!", now, now);
    }

    // Seed 8 Standard Hello-Hi CMS Pages
    if (true) {
      const insertPage = this.db.prepare(`
        INSERT INTO cms_pages (
          id, slug, language, title, short_description, content, faq_items_json,
          status, visibility, published_revision_id, meta_title, meta_description,
          canonical_url, robots_index, og_title, og_description, og_image,
          created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertRevision = this.db.prepare(`
        INSERT INTO cms_revisions (
          id, page_id, page_slug, language, revision_number, title, short_description,
          content, faq_items_json, seo_json, status, change_summary,
          created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertAudit = this.db.prepare(`
        INSERT INTO cms_audit_logs (
          id, page_slug, language, action, previous_status, new_status,
          performed_by, performed_by_role, details, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const initialPages = [
        {
          id: "page-terms",
          slug: "terms-and-conditions",
          title: "Terms & Conditions",
          shortDescription: "Read our Terms & Conditions to understand the rules, guidelines and policies for using the Hello-Hi platform and services.",
          content: `<h2>1. Introduction</h2><p>Welcome to Hello-Hi. These Terms &amp; Conditions govern your use of the Hello-Hi platform, including our website, mobile application, and all related services. By accessing or using Hello-Hi, you agree to be bound by these terms. If you do not agree to these terms, please do not use our platform.</p><h2>2. Use of the Platform</h2><p>Hello-Hi is a hyperlocal platform that connects users with nearby businesses and service providers. You agree to use the platform only for lawful purposes and in accordance with these Terms &amp; Conditions.</p><h2>3. User Accounts</h2><p>To access certain features, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p><h2>4. Services</h2><p>Hello-Hi provides a platform for discovering and accessing local businesses, services, and offers. We do not directly provide the services listed, and we are not responsible for the quality, safety, or legality of services offered by third-party providers.</p>`,
          faqItems: null,
          metaTitle: "Terms & Conditions | Hello-Hi",
          metaDescription: "Read our Terms & Conditions to understand the rules, guidelines and policies for using the Hello-Hi platform and services.",
        },
        {
          id: "page-privacy",
          slug: "privacy-policy",
          title: "Privacy Policy",
          shortDescription: "Learn how Hello-Hi collects, protects, uses, and respects your personal data in full compliance with the Digital Personal Data Protection (DPDP) Act 2023.",
          content: `<h2>1. Information We Collect</h2><p>We collect information you provide directly to us when creating an account, searching for local businesses, sending enquiries, or contacting support. This includes your mobile phone number, name, and location preferences.</p><h2>2. How We Use Your Information</h2><p>Your information is used strictly to facilitate instant connections with verified hyperlocal businesses, authenticate logins via secure OTP SMS, and enhance your discovery experience.</p><h2>3. Compliance with DPDP Act 2023</h2><p>Hello-Hi complies with the Digital Personal Data Protection Act, 2023. We enforce data minimization, consent management, and purpose limitation across all user interactions.</p>`,
          faqItems: null,
          metaTitle: "Privacy Policy | Hello-Hi DPDP 2023",
          metaDescription: "Learn how Hello-Hi collects, protects, and respects your personal data in full compliance with DPDP 2023.",
        },
        {
          id: "page-faqs",
          slug: "faqs",
          title: "FAQs",
          shortDescription: "Frequently Asked Questions about finding verified businesses, placing enquiries, and booking local services on Hello-Hi.",
          content: `<p>Find quick answers to common questions about using Hello-Hi, Andhra Pradesh's premier hyperlocal search and discovery network.</p>`,
          faqItems: [
            {
              id: "faq-1",
              question: "What is Hello-Hi?",
              answer: "Hello-Hi is India's premier hyperlocal discovery and instant lead connection super-app connecting verified businesses with local consumers across Andhra Pradesh and Telangana.",
              order: 1
            },
            {
              id: "faq-2",
              question: "How are businesses verified on Hello-Hi?",
              answer: "Our ground operations team verifies government business registrations (GSTIN/Trade License/FSSAI/Medical Council) and performs physical store location audits before granting the green verified badge.",
              order: 2
            },
            {
              id: "faq-3",
              question: "Is searching for services free for consumers?",
              answer: "Yes, consumers can search, compare, call, and chat on WhatsApp with verified local businesses completely free with zero hidden commissions.",
              order: 3
            },
            {
              id: "faq-4",
              question: "How do I list my business on Hello-Hi?",
              answer: "Business owners can sign up via our vendor onboarding portal or contact support. Once documents are uploaded and approved by Super Admin, your profile goes live instantly.",
              order: 4
            }
          ],
          metaTitle: "Frequently Asked Questions | Hello-Hi Help Center",
          metaDescription: "Browse FAQs about business verification, customer enquiries, and local search on Hello-Hi.",
        },
        {
          id: "page-about",
          slug: "about-us",
          title: "About Us",
          shortDescription: "Discover Hello-Hi's vision: building India's fastest, zero-brokerage hyperlocal commerce & discovery engine.",
          content: `<h2>Empowering Local Indian Commerce</h2><p>Hello-Hi was built to celebrate and accelerate India's neighborhood enterprises. From traditional family-run clinics and dining destinations to modern home services, our platform gives local businesses enterprise-grade discovery tools.</p><h2>Our Pillars</h2><ul><li><strong>Hyperlocal Precision:</strong> Neighborhood-level indexing down to pin-codes and landmark streets.</li><li><strong>Verified Authenticity:</strong> Strict regulatory KYC and zero fake reviews.</li><li><strong>Instant Direct Connect:</strong> Real-time WhatsApp and phone enquiries with zero intermediate commission deductions.</li></ul>`,
          faqItems: null,
          metaTitle: "About Us | Hello-Hi Hyperlocal Super-App",
          metaDescription: "Learn about Hello-Hi's mission to connect neighborhood businesses with consumers across India.",
        },
        {
          id: "page-refund",
          slug: "refund-cancellation-policy",
          title: "Refund & Cancellation Policy",
          shortDescription: "Clear terms and transparent timelines for merchant subscription cancellations and customer payment protections.",
          content: `<h2>1. Subscription Cancellations</h2><p>Vendors subscribing to Hello-Hi Sponsored Placement tiers may cancel their billing cycle within 7 days of activation for a prorated refund if fewer than 3 leads have been delivered.</p><h2>2. Dispute Resolution</h2><p>For any billing discrepancies, our finance resolution team provides dispute clearance within 3 business days via support@hello-hi.in.</p>`,
          faqItems: null,
          metaTitle: "Refund & Cancellation Policy | Hello-Hi",
          metaDescription: "Review subscription cancellation timelines and refund dispute policies for Hello-Hi.",
        },
        {
          id: "page-contact",
          slug: "contact-support",
          title: "Contact & Support",
          shortDescription: "Reach Hello-Hi 24/7 customer assistance, grievance officers, and Vijayawada headquarters.",
          content: `<h2>Get in Touch with Hello-Hi Support</h2><p>We are dedicated to providing fast and reliable support to consumers and merchants alike:</p><ul><li><strong>Customer Helpline:</strong> 1800-425-HELLO (Toll Free, 8:00 AM - 10:00 PM IST)</li><li><strong>WhatsApp Desk:</strong> +91 98480 22338</li><li><strong>Grievance Email:</strong> grievance@hello-hi.in</li><li><strong>Corporate Headquarters:</strong> Level 4, Benz Circle Commercial Hub, MG Road, Vijayawada, AP 520010</li></ul>`,
          faqItems: null,
          metaTitle: "Contact Us & Customer Support | Hello-Hi",
          metaDescription: "Reach out to Hello-Hi 24/7 support, grievance desk, and Andhra Pradesh headquarters.",
        },
        {
          id: "page-cookie",
          slug: "cookie-policy",
          title: "Cookie Policy",
          shortDescription: "Manage cookies and tracking consent preferences according to DPDP Act 2023 and global privacy standards.",
          content: `<h2>1. What Are Cookies?</h2><p>Cookies are small text files stored on your browser or device when you visit Hello-Hi websites and mobile applications. They help us remember your city preferences, secure your sessions, and optimize local discovery.</p><h2>2. Types of Cookies We Use</h2><ul><li><strong>Essential Cookies:</strong> Necessary for secure login, session continuity, and fraud prevention.</li><li><strong>Analytical Cookies:</strong> Help us measure platform performance and popular merchant searches across Andhra Pradesh & Telangana.</li><li><strong>Preference Cookies:</strong> Remember your selected city, locality, and search radius.</li></ul><h2>3. Managing Cookie Preferences</h2><p>You can adjust your browser settings to reject non-essential cookies at any time without restricting your core access to Hello-Hi.</p>`,
          faqItems: null,
          metaTitle: "Cookie Policy | Hello-Hi",
          metaDescription: "Understand how Hello-Hi uses cookies to optimize your hyperlocal discovery and secure your browsing.",
        },
        {
          id: "page-community",
          slug: "community-guidelines",
          title: "Community Guidelines",
          shortDescription: "Standards for respectful reviews, authentic vendor profiles, and zero-tolerance harassment rules across Hello-Hi.",
          content: `<h2>Our Commitment to Authentic Hyperlocal Discovery</h2><p>Hello-Hi connects consumers and local neighborhood businesses. To ensure a safe, helpful, and trustworthy ecosystem, all users and merchants must follow these guidelines.</p><h2>1. Honest & Unbiased Reviews</h2><p>Reviews must reflect genuine personal experiences. Paid reviews, competitor disparagement, and extortion threats are strictly prohibited and will lead to account suspension.</p><h2>2. Zero Tolerance for Hate Speech & Harassment</h2><p>Discriminatory comments based on religion, caste, gender, language, or background will result in immediate termination of platform privileges.</p><h2>3. Merchant Quality Standards</h2><p>Merchants must provide accurate business descriptions, current operational hours, and authentic service images. False documentation during KYC review will result in permanent rejection.</p>`,
          faqItems: null,
          metaTitle: "Community Guidelines & Standards | Hello-Hi",
          metaDescription: "Read Hello-Hi community rules, review integrity policies, and merchant code of conduct.",
        }
      ];

      for (const p of initialPages) {
        const existing = this.db.prepare("SELECT id FROM cms_pages WHERE slug = ?").get(p.slug);
        if (existing) continue;
        const revId = `rev-${p.slug}-1`;
        const faqJson = p.faqItems ? JSON.stringify(p.faqItems) : null;
        const seoJson = JSON.stringify({
          metaTitle: p.metaTitle,
          metaDescription: p.metaDescription,
          canonicalUrl: `https://www.hello-hi.com/${p.slug}`,
          robotsIndex: true,
          ogTitle: p.title,
          ogDescription: p.shortDescription,
        });

        // Insert Page (Published by default)
        insertPage.run(
          p.id,
          p.slug,
          "en",
          p.title,
          p.shortDescription,
          p.content,
          faqJson,
          "PUBLISHED",
          "PUBLIC",
          revId,
          p.metaTitle,
          p.metaDescription,
          `https://www.hello-hi.com/${p.slug}`,
          1,
          p.title,
          p.shortDescription,
          null,
          "Super Admin",
          "Super Admin",
          now,
          now
        );

        // Insert Baseline Revision 1
        insertRevision.run(
          revId,
          p.id,
          p.slug,
          "en",
          1,
          p.title,
          p.shortDescription,
          p.content,
          faqJson,
          seoJson,
          "PUBLISHED",
          "Initial system publication",
          "Super Admin",
          now
        );

        // Insert Initial Audit Log
        insertAudit.run(
          `audit-${p.slug}-init`,
          p.slug,
          "en",
          "PUBLISH",
          "DRAFT",
          "PUBLISHED",
          "Super Admin",
          "SUPER_ADMIN",
          `Initial publication of ${p.title}`,
          now
        );
      }
    }

    // 5. Subscription Plans
    const plansCount = this.db.prepare("SELECT COUNT(*) as count FROM subscription_plans").get() as { count: number };
    if (plansCount.count === 0) {
      const insertPlan = this.db.prepare(`
        INSERT INTO subscription_plans (id, name, description, price, currency, billing_interval, features, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertPlan.run(
        "plan_starter",
        "Hyperlocal Starter",
        "Essential digital presence for neighborhood single-outlet stores.",
        2999,
        "INR",
        "MONTHLY",
        JSON.stringify([
          "Official Verified Merchant Badge",
          "25 Instant Customer Leads / mo",
          "WhatsApp Direct Enquiry Button",
          "Standard Neighborhood Radius Indexing",
          "Basic Review Management"
        ]),
        "ACTIVE",
        now,
        now
      );

      insertPlan.run(
        "plan_growth",
        "Growth Merchant Pro",
        "High-visibility placement for growing businesses and popular clinics.",
        7999,
        "INR",
        "MONTHLY",
        JSON.stringify([
          "Top 5 Category Search Placement",
          "100 Verified Instant Leads / mo",
          "Real-time SMS & WhatsApp Alerts",
          "Photo Gallery (up to 30 images)",
          "Competitor Protection on Listing Page",
          "Dedicated Phone Support"
        ]),
        "ACTIVE",
        now,
        now
      );

      insertPlan.run(
        "plan_enterprise",
        "Enterprise Multi-Outlet",
        "Dominant sponsor status with unlimited leads and API integration.",
        18999,
        "INR",
        "MONTHLY",
        JSON.stringify([
          "Top 1 Pinned Sponsored Partner",
          "Unlimited Lead Routing & Zero Commission",
          "Multi-Outlet & Multi-Staff Management",
          "API & CRM Webhook Integration",
          "Dedicated Relationship Manager",
          "Custom Promo Banners on Category Page"
        ]),
        "ACTIVE",
        now,
        now
      );
    }

    // 6. Subscriptions
    const subsCount = this.db.prepare("SELECT COUNT(*) as count FROM subscriptions").get() as { count: number };
    if (subsCount.count === 0) {
      const insertSub = this.db.prepare(`
        INSERT INTO subscriptions (id, subscriber_name, subscriber_email, subscriber_phone, plan_id, plan_name, status, amount, currency, start_date, expiry_date, auto_renew, payment_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const sampleSubs = [
        { id: "sub_101", name: "Amravati Grand Restaurant", email: "amravati@hello-hi.in", phone: "+91 98480 11001", planId: "plan_growth", planName: "Growth Merchant Pro", status: "ACTIVE", amount: 7999, start: "2026-10-01T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z", auto: 1, payStatus: "PAID" },
        { id: "sub_102", name: "Srinivasa Packers & Movers", email: "srinivasa.packers@hello-hi.in", phone: "+91 98480 11002", planId: "plan_starter", planName: "Hyperlocal Starter", status: "ACTIVE", amount: 2999, start: "2026-10-15T00:00:00.000Z", end: "2026-11-15T00:00:00.000Z", auto: 1, payStatus: "PAID" },
        { id: "sub_103", name: "Siri Dental Clinic", email: "siri.dental@hello-hi.in", phone: "+91 98480 11003", planId: "plan_enterprise", planName: "Enterprise Multi-Outlet", status: "ACTIVE", amount: 18999, start: "2026-09-01T00:00:00.000Z", end: "2026-12-01T00:00:00.000Z", auto: 1, payStatus: "PAID" },
        { id: "sub_104", name: "Fernat Dental Business", email: "fernat.business@hello-hi.in", phone: "+91 98480 11004", planId: "plan_growth", planName: "Growth Merchant Pro", status: "PENDING", amount: 7999, start: "2026-10-28T00:00:00.000Z", end: "2026-11-28T00:00:00.000Z", auto: 0, payStatus: "PENDING" },
        { id: "sub_105", name: "Sri Balaji Pure Ghee Sweets", email: "balaji.sweets@hello-hi.in", phone: "+91 98480 11005", planId: "plan_starter", planName: "Hyperlocal Starter", status: "EXPIRED", amount: 2999, start: "2026-08-01T00:00:00.000Z", end: "2026-09-01T00:00:00.000Z", auto: 0, payStatus: "PAID" },
        { id: "sub_106", name: "Royal Enfield Care Hub", email: "re.care@hello-hi.in", phone: "+91 98480 11006", planId: "plan_growth", planName: "Growth Merchant Pro", status: "ACTIVE", amount: 7999, start: "2026-10-10T00:00:00.000Z", end: "2026-11-10T00:00:00.000Z", auto: 1, payStatus: "PAID" },
        { id: "sub_107", name: "Vijayawada Marble & Granites", email: "vja.marble@hello-hi.in", phone: "+91 98480 11007", planId: "plan_starter", planName: "Hyperlocal Starter", status: "CANCELLED", amount: 2999, start: "2026-07-01T00:00:00.000Z", end: "2026-08-01T00:00:00.000Z", auto: 0, payStatus: "PAID" },
        { id: "sub_108", name: "Kasturi Ayurvedic Wellness", email: "kasturi.ayur@hello-hi.in", phone: "+91 98480 11008", planId: "plan_enterprise", planName: "Enterprise Multi-Outlet", status: "ACTIVE", amount: 18999, start: "2026-10-05T00:00:00.000Z", end: "2027-01-05T00:00:00.000Z", auto: 1, payStatus: "PAID" }
      ];

      for (const s of sampleSubs) {
        insertSub.run(s.id, s.name, s.email, s.phone, s.planId, s.planName, s.status, s.amount, "INR", s.start, s.end, s.auto, s.payStatus, s.start, s.start);
      }
    }

    // 7. Payments
    const payCount = this.db.prepare("SELECT COUNT(*) as count FROM payments").get() as { count: number };
    if (payCount.count === 0) {
      const insertPay = this.db.prepare(`
        INSERT INTO payments (id, transaction_ref, payer_name, payer_email, payer_type, amount, currency, payment_method, status, gateway_ref, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const samplePayments = [
        { id: "pay_101", ref: "TXN_UPI_98410294", name: "Amravati Grand Restaurant", email: "amravati@hello-hi.in", type: "MERCHANT", amount: 7999, method: "UPI", status: "COMPLETED", gw: "rzp_live_94821094", desc: "Monthly Renewal - Growth Merchant Pro", date: "2026-10-31T09:15:00.000Z" },
        { id: "pay_102", ref: "TXN_CARD_84920194", name: "Siri Dental Clinic", email: "siri.dental@hello-hi.in", type: "MERCHANT", amount: 18999, method: "CREDIT_CARD", status: "COMPLETED", gw: "rzp_live_72940182", desc: "Quarterly Placement - Enterprise Multi-Outlet", date: "2026-10-30T14:22:00.000Z" },
        { id: "pay_103", ref: "TXN_UPI_74920184", name: "Srinivasa Packers & Movers", email: "srinivasa.packers@hello-hi.in", type: "MERCHANT", amount: 2999, method: "UPI", status: "COMPLETED", gw: "rzp_live_61940284", desc: "Starter Package Activation", date: "2026-10-29T11:45:00.000Z" },
        { id: "pay_104", ref: "TXN_NB_63820194", name: "Fernat Dental Business", email: "fernat.business@hello-hi.in", type: "MERCHANT", amount: 7999, method: "NET_BANKING", status: "PENDING", gw: "rzp_live_50938201", desc: "Growth Tier Subscription Invoice", date: "2026-10-28T16:30:00.000Z" },
        { id: "pay_105", ref: "TXN_CARD_52940183", name: "Royal Enfield Care Hub", email: "re.care@hello-hi.in", type: "MERCHANT", amount: 7999, method: "CREDIT_CARD", status: "COMPLETED", gw: "rzp_live_49201842", desc: "Monthly Partner Subscription", date: "2026-10-27T10:12:00.000Z" },
        { id: "pay_106", ref: "TXN_UPI_41938201", name: "Sri Balaji Pure Ghee Sweets", email: "balaji.sweets@hello-hi.in", type: "MERCHANT", amount: 2999, method: "UPI", status: "FAILED", gw: "rzp_live_38291048", desc: "Renewal Payment - Bank Timeout", date: "2026-10-26T18:05:00.000Z" },
        { id: "pay_107", ref: "TXN_WALLET_30948291", name: "Vijayawada Marble & Granites", email: "vja.marble@hello-hi.in", type: "MERCHANT", amount: 2999, method: "WALLET", status: "REFUNDED", gw: "rzp_live_27194028", desc: "Refund - Cancellation within 7 days", date: "2026-10-25T12:00:00.000Z" },
        { id: "pay_108", ref: "TXN_NB_29840192", name: "Kasturi Ayurvedic Wellness", email: "kasturi.ayur@hello-hi.in", type: "MERCHANT", amount: 18999, method: "NET_BANKING", status: "COMPLETED", gw: "rzp_live_16049281", desc: "Annual Sponsor Package Tier", date: "2026-10-24T09:00:00.000Z" },
        { id: "pay_109", ref: "TXN_UPI_18739201", name: "Praveen Kumar (Consumer)", email: "praveen.k@gmail.com", type: "CUSTOMER", amount: 499, method: "UPI", status: "COMPLETED", gw: "rzp_live_05938201", desc: "Express Doctor Consultation Booking", date: "2026-10-23T15:20:00.000Z" },
        { id: "pay_110", ref: "TXN_UPI_07629182", name: "Manoj Reddy (Consumer)", email: "manoj.reddy@yahoo.com", type: "CUSTOMER", amount: 250, method: "UPI", status: "COMPLETED", gw: "rzp_live_94820182", desc: "Instant Specialist Appointment Token", date: "2026-10-22T17:40:00.000Z" }
      ];

      for (const p of samplePayments) {
        insertPay.run(p.id, p.ref, p.name, p.email, p.type, p.amount, "INR", p.method, p.status, p.gw, p.desc, p.date, p.date);
      }
    }

    // 8. Notifications
    const notifCount = this.db.prepare("SELECT COUNT(*) as count FROM notifications").get() as { count: number };
    if (notifCount.count === 0) {
      const insertNotif = this.db.prepare(`
        INSERT INTO notifications (id, title, message, type, recipient, is_read, related_entity, related_id, created_at, read_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      
    try {
      this.db.exec(`
        INSERT OR IGNORE INTO push_templates (id, event_type, name, title_template, body_template, destination_url, status, created_at, updated_at) VALUES
        ('tmpl_1', 'REFERRAL_REWARD_GRANTED', 'Referral Reward Credited', 'Congratulations! You earned ₹{{reward_amount}}', 'Your referral {{referee_name}} joined Hello! Bonus credited to your wallet.', 'wallet', 'ACTIVE', datetime('now'), datetime('now')),
        ('tmpl_2', 'BUSINESS_LISTING_APPROVED', 'Business Listing Approved', 'Your business {{business_name}} is now live!', 'Customers in {{city}} can now find your services and place enquiries directly.', 'business/profile', 'ACTIVE', datetime('now'), datetime('now')),
        ('tmpl_3', 'NEW_ENQUIRY_RECEIVED', 'New Customer Enquiry', 'New enquiry for {{service_name}}!', 'A customer in {{locality}} requested a callback. Open enquiry to respond.', 'enquiries', 'ACTIVE', datetime('now'), datetime('now')),
        ('tmpl_4', 'BUSINESS_VERIFICATION_COMPLETED', 'KYC Verification Completed', 'Your documents have been verified!', 'Your verified badge is now active on your store listing.', 'business/kyc', 'ACTIVE', datetime('now'), datetime('now')),
        ('tmpl_5', 'ACCOUNT_STATUS_CHANGED', 'Account Security Alert', 'Security status update for your account', 'Your account settings were updated on {{timestamp}} from {{device}}.', 'profile/security', 'ACTIVE', datetime('now'), datetime('now'));
      INSERT OR IGNORE INTO normal_push_logs (id, notification_ref, event_type, recipient_type, recipient_id, recipient_phone, title, message, destination_url, delivery_status, created_at, sent_at) VALUES
      ('npl_1', 'PUSH-TXN-98210', 'NEW_ENQUIRY_RECEIVED', 'BUSINESS', 'biz-amravati', '+919848011111', 'New Customer Enquiry for Amravati Grand Restaurant!', 'A customer in your service area requested a callback. Open enquiry to respond.', 'enquiries', 'DELIVERED', datetime('now', '-1 hours'), datetime('now', '-1 hours')),
      ('npl_2', 'PUSH-TXN-98211', 'BUSINESS_LISTING_APPROVED', 'MERCHANT', 'biz-siri-dental', '+919848022222', 'Your business Siri Dental Clinic is now live!', 'Customers in Vijayawada can now find your services and place enquiries directly.', 'business/profile', 'DELIVERED', datetime('now', '-3 hours'), datetime('now', '-3 hours')),
      ('npl_3', 'PUSH-TXN-98212', 'REFERRAL_REWARD_GRANTED', 'CUSTOMER', 'user-cust-102', '+919848033333', 'Congratulations! You earned ₹150', 'Your referral Ravi Kumar joined Hello! Bonus credited to your wallet.', 'wallet', 'DELIVERED', datetime('now', '-5 hours'), datetime('now', '-5 hours')),
      ('npl_4', 'PUSH-TXN-98213', 'BUSINESS_VERIFICATION_COMPLETED', 'MERCHANT', 'biz-amravati', '+919848011111', 'KYC Verification Completed', 'Your verified badge is now active on your store listing.', 'business/kyc', 'DELIVERED', datetime('now', '-1 days'), datetime('now', '-1 days')),
      ('npl_5', 'PUSH-TXN-98214', 'ACCOUNT_STATUS_CHANGED', 'CUSTOMER', 'user-cust-105', '+919848044444', 'Security status update for your account', 'Your account settings were updated on today from Chrome Mobile.', 'profile/security', 'DELIVERED', datetime('now', '-2 days'), datetime('now', '-2 days'));
    
      `);
    } catch {}
  


      


      const sampleNotifs = [
        { id: "notif_001", title: "4 New Merchant KYC Submissions", message: "Vijayawada & Guntur vendors submitted documents for verification.", type: "KYC_VERIFICATION", isRead: 0, entity: "businesses", refId: "queue-1", date: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
        { id: "notif_002", title: "Monthly Revenue Milestone Crossed", message: "Platform subscription collections crossed ₹18,45,200 benchmark target.", type: "FINANCIAL", isRead: 0, entity: "subscriptions", refId: "sub_101", date: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
        { id: "notif_003", title: "CMS Page Published: Terms & Conditions", message: "Terms & Conditions published to v2.4 by Super Admin.", type: "CMS_UPDATE", isRead: 0, entity: "cms_pages", refId: "terms-and-conditions", date: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
        { id: "notif_004", title: "Priority Lead Surge in Visakhapatnam", message: "Over 128 customer enquiries registered in Hitec & Benz Circle sectors.", type: "SYSTEM_ALERT", isRead: 0, entity: "enquiries", refId: "enq_surge_vsp", date: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
        { id: "notif_005", title: "Vendor Subscription Renewed", message: "Amravati Grand Restaurant renewed Growth Merchant Pro tier successfully.", type: "FINANCIAL", isRead: 0, entity: "payments", refId: "pay_101", date: new Date(Date.now() - 8 * 3600 * 1000).toISOString() },
        { id: "notif_006", title: "License Expiry Reminder", message: "Siri Dental Clinic Medical License is due for annual renewal in 15 days.", type: "KYC_VERIFICATION", isRead: 1, entity: "businesses", refId: "queue-3", date: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
        { id: "notif_007", title: "Dispute Clearance Processed", message: "Dispute #8492 resolved for Lead Credit refund of ₹2,999.", type: "FINANCIAL", isRead: 1, entity: "payments", refId: "pay_107", date: new Date(Date.now() - 48 * 3600 * 1000).toISOString() },
        { id: "notif_008", title: "Security Credential Updated", message: "Platform root Super Admin password credentials refreshed.", type: "SECURITY", isRead: 1, entity: "users", refId: "usr_super_admin", date: new Date(Date.now() - 72 * 3600 * 1000).toISOString() }
      ];

      for (const n of sampleNotifs) {
        insertNotif.run(n.id, n.title, n.message, n.type, "Super Admin", n.isRead, n.entity, n.refId, n.date, n.isRead ? n.date : null);
      }
    }
  

    // 9. Wallet Transactions
    const txCount = this.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM wallet_transactions");
    if (!txCount || txCount.c === 0) {
      const insertTx = this.db.prepare(
        "INSERT INTO wallet_transactions (id, wallet_id, user_name, user_type, type, amount, balance_after, reference, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const nowIso = new Date().toISOString();
      insertTx.run("wt-001", "WAL-1001", "Vijay Kumar", "CUSTOMER", "CREDIT", 500, 1500, "UPI/2026/89123", "SUCCESS", nowIso);
      insertTx.run("wt-002", "WAL-1002", "Swagath Grand Hotel", "MERCHANT", "DEBIT", 1200, 4800, "COMMISSION/992", "SUCCESS", nowIso);
      insertTx.run("wt-003", "WAL-1003", "Sneha Reddy", "CUSTOMER", "REFUND", 250, 750, "REF/882194", "SUCCESS", nowIso);
      insertTx.run("wt-004", "WAL-1004", "Sai Medicals", "MERCHANT", "WITHDRAWAL", 3000, 2000, "WDL/99012", "PENDING", nowIso);
    }

    // 10. Withdrawals
    const wdlCount = this.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM withdrawals");
    if (!wdlCount || wdlCount.c === 0) {
      const insertWdl = this.db.prepare(
        "INSERT INTO withdrawals (id, merchant_id, merchant_name, amount, bank_account, ifsc_code, status, payout_ref, requested_at, processed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      const nowIso = new Date().toISOString();
      insertWdl.run("wdl-101", "biz-swagath-grand", "Swagath Grand Hotel", 8500, "HDFC0001234 - 501002938192", "HDFC0001234", "APPROVED", "PAYOUT-HDFC-9912", nowIso, nowIso);
      insertWdl.run("wdl-102", "biz-sai-medicals", "Sai Medical & General Stores", 4200, "SBI0004921 - 20391829481", "SBI0004921", "PENDING", null, nowIso, null);
      insertWdl.run("wdl-103", "biz-apex-rentals", "Apex Self-Drive Cars", 15000, "ICIC0000832 - 10928374619", "ICIC0000832", "PROCESSING", "PAYOUT-ICICI-1102", nowIso, null);
    }
  }

  public query<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  public queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params);
    return (result as T) || null;
  }

  public execute(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);

    if (this.mysqlPool) {
      this.replicateToMySQL(sql, params);
    }

    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    };
  }

  private async replicateToMySQL(sql: string, params: any[]) {
    if (!this.mysqlPool) return;
    try {
      // Normalize parameterized syntax for MySQL
      await this.mysqlPool.execute(sql, params);
    } catch (err: any) {
      // Non-blocking replica log
      // console.debug("[MySQL Replication Notice]", err?.message || err);
    }
  }

  public getMySQLPool(): mysql.Pool | null {
    return this.mysqlPool;
  }
}
