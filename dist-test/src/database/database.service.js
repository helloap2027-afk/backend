"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const node_sqlite_1 = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");
let DatabaseService = class DatabaseService {
    constructor() {
        this.dbPath = "";
    }
    onModuleInit() {
        this.initDatabase();
    }
    onModuleDestroy() {
        if (this.db) {
            this.db.close();
        }
    }
    initDatabase(inMemory = false) {
        if (inMemory) {
            this.db = new node_sqlite_1.DatabaseSync(":memory:");
        }
        else {
            const dataDir = path.resolve(process.cwd(), "data");
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            this.dbPath = path.join(dataDir, "hello_dev.db");
            this.db = new node_sqlite_1.DatabaseSync(this.dbPath);
        }
        this.db.exec("PRAGMA foreign_keys = ON;");
        this.createTables();
        this.seedDefaults();
    }
    createTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone_number TEXT UNIQUE NOT NULL,
        full_name TEXT,
        email TEXT UNIQUE,
        avatar_url TEXT,
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
      CREATE INDEX IF NOT EXISTS idx_saved_biz_user ON saved_businesses(user_id);
    `);
    }
    seedDefaults() {
        const now = new Date().toISOString();
        const rolesCount = this.db.prepare("SELECT COUNT(*) as count FROM roles").get();
        if (rolesCount.count === 0) {
            const insertRole = this.db.prepare("INSERT INTO roles (id, name, description) VALUES (?, ?, ?)");
            insertRole.run("role-cust", "CUSTOMER", "Consumer discovering local businesses and sending leads");
            insertRole.run("role-owner", "VENDOR_OWNER", "Business owner with full rights over business profiles and staff");
            insertRole.run("role-staff", "VENDOR_STAFF", "Business staff managing assigned leads");
            insertRole.run("role-superadmin", "SUPER_ADMIN", "Platform root administrative privileges");
        }
        const statesCount = this.db.prepare("SELECT COUNT(*) as count FROM states").get();
        if (statesCount.count === 0) {
            const insertState = this.db.prepare("INSERT INTO states (id, name, code, is_active) VALUES (?, ?, ?, 1)");
            insertState.run("state-ap", "Andhra Pradesh", "AP");
            const insertDistrict = this.db.prepare("INSERT INTO districts (id, state_id, name) VALUES (?, ?, ?)");
            insertDistrict.run("dist-krishna", "state-ap", "Krishna");
            insertDistrict.run("dist-guntur", "state-ap", "Guntur");
            const insertCity = this.db.prepare("INSERT INTO cities (id, district_id, name, slug, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)");
            insertCity.run("city-vja", "dist-krishna", "Vijayawada", "vijayawada", 16.5062, 80.6480);
            insertCity.run("city-gun", "dist-guntur", "Guntur", "guntur", 16.3067, 80.4365);
            const insertLoc = this.db.prepare("INSERT INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
            insertLoc.run("loc-nahamar", "city-vja", "Nahamar", "nahamar", "520008", 16.5120, 80.6515);
            insertLoc.run("loc-benz", "city-vja", "Benz Circle", "benz-circle", "520010", 16.5015, 80.6430);
            insertLoc.run("loc-onetown", "city-vja", "One Town", "one-town", "520001", 16.5180, 80.6190);
            insertLoc.run("loc-brodipet", "city-gun", "Brodipet", "brodipet", "522002", 16.3050, 80.4380);
            insertLoc.run("loc-arundelpet", "city-gun", "Arundelpet", "arundelpet", "522002", 16.3120, 80.4320);
        }
        const catCount = this.db.prepare("SELECT COUNT(*) as count FROM categories").get();
        if (catCount.count === 0) {
            const insertCat = this.db.prepare("INSERT INTO categories (id, parent_id, name, slug, icon_name, meta_title, meta_description, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)");
            insertCat.run("cat-food", null, "Restaurants & Dining", "restaurants-food", "UtensilsCrossed", "Best Restaurants & Food in AP", "Discover authentic dining, biryani, family restaurants and cafes", 1);
            insertCat.run("cat-doctors", null, "Doctors & Clinics", "doctors-clinics", "Stethoscope", "Top Doctors & Medical Clinics", "Find verified doctors, general physicians and pediatricians", 2);
            insertCat.run("cat-dental", null, "Dental Care", "dental-care", "SmilePlus", "Dental Clinics & Dentists", "Expert dentists, root canal, dental implants and braces", 3);
            insertCat.run("cat-movers", null, "Packers & Movers", "packers-movers", "Truck", "Verified Packers & Movers", "Household shifting, office relocation and transport services", 4);
            insertCat.run("cat-home", null, "Home Services", "home-services", "Home", "Reliable Home Maintenance & Services", "Deep cleaning, painting, carpentry and pest control", 5);
            insertCat.run("cat-tours", null, "Tours & Travel", "tours-travel", "Plane", "Travel Agencies & Car Rentals", "Outstation cabs, tourism packages, airport taxi and buses", 6);
            insertCat.run("cat-electric", null, "Electrical & Plumbing", "electrical-plumbing", "Zap", "Electricians & Plumbers", "Emergency electricians, wiring, pipe leakage and sanitary works", 7);
            insertCat.run("cat-beauty", null, "Beauty & Wellness", "beauty-salons", "Sparkles", "Salons, Spas & Beauty Parlours", "Hair salons, bridal makeup, skincare and wellness centers", 8);
            insertCat.run("cat-education", null, "Education & Coaching", "education-coaching", "GraduationCap", "Top Tuition & Coaching Institutes", "IIT-JEE/NEET coaching, competitive exams and tuition centers", 9);
            insertCat.run("cat-realestate", null, "Real Estate & Rentals", "real-estate", "Building2", "Real Estate Agents & Properties", "Residential flats, commercial rentals, plots and ventures", 10);
            const insertService = this.db.prepare("INSERT INTO services (id, category_id, name, slug) VALUES (?, ?, ?, ?)");
            insertService.run("srv-1", "cat-food", "Family Dining", "family-dining");
            insertService.run("srv-2", "cat-food", "Biryani & Tandoor", "biryani-tandoor");
            insertService.run("srv-3", "cat-food", "South Indian Thali", "south-indian-thali");
            insertService.run("srv-4", "cat-doctors", "General Physician", "general-physician");
            insertService.run("srv-5", "cat-doctors", "Pediatrician", "pediatrician");
            insertService.run("srv-6", "cat-dental", "Root Canal Treatment", "root-canal-treatment");
            insertService.run("srv-7", "cat-dental", "Teeth Whitening", "teeth-whitening");
            insertService.run("srv-8", "cat-dental", "Dental Implants", "dental-implants");
            insertService.run("srv-9", "cat-movers", "Household Shifting", "household-shifting");
            insertService.run("srv-10", "cat-movers", "Office Relocation", "office-relocation");
            insertService.run("srv-11", "cat-home", "Deep Cleaning", "deep-cleaning");
            insertService.run("srv-12", "cat-home", "House Painting", "house-painting");
            insertService.run("srv-13", "cat-tours", "Outstation Cabs", "outstation-cabs");
            insertService.run("srv-14", "cat-tours", "AP Tourism Packages", "ap-tourism-packages");
            insertService.run("srv-15", "cat-electric", "AC Installation & Service", "ac-installation-service");
            insertService.run("srv-16", "cat-electric", "House Wiring & Inverters", "house-wiring-inverters");
        }
        let defaultVendor = this.db.prepare("SELECT id FROM users WHERE phone_number = ?").get("+919848099999");
        if (!defaultVendor) {
            const vendorId = "user-vendor-pilot";
            this.db.prepare("INSERT INTO users (id, phone_number, full_name, email, status, phone_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)").run(vendorId, "+919848099999", "Ramesh Kumar (Pilot Partner)", "ramesh.kumar@hello-hi.in", now, now, now);
            this.db.prepare("INSERT INTO user_permissions (id, user_id, role_id) VALUES (?, ?, 'role-owner')").run("perm-vendor-pilot", vendorId);
            defaultVendor = { id: vendorId };
        }
        const bizCount = this.db.prepare("SELECT COUNT(*) as count FROM businesses").get();
        if (bizCount.count === 0) {
            const insertBiz = this.db.prepare(`
        INSERT INTO businesses (
          id, name, legal_name, slug, description, primary_phone, whatsapp_number, support_email,
          logo_url, cover_image_url, status, is_verified, verified_at, is_featured,
          average_rating, total_reviews, total_enquiries, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const insertBizLoc = this.db.prepare(`
        INSERT INTO business_locations (
          id, business_id, city_id, locality_id, address_line1, landmark, pincode, latitude, longitude, is_primary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);
            const insertBizCat = this.db.prepare(`
        INSERT INTO business_categories (id, business_id, category_id, is_primary) VALUES (?, ?, ?, ?)
      `);
            const insertBizOwner = this.db.prepare(`
        INSERT INTO business_owners (id, business_id, user_id, ownership_type, is_primary) VALUES (?, ?, ?, 'FOUNDER', 1)
      `);
            const insertHour = this.db.prepare(`
        INSERT INTO business_hours (id, business_id, day_of_week, opens_at, closes_at, is_closed) VALUES (?, ?, ?, ?, ?, ?)
      `);
            insertBiz.run("biz-amravati", "Amravati Grand Restaurant", "Amravati Hospitality Pvt Ltd", "amravati-grand-restaurant", "Premier authentic Andhra cuisine, royal thali, aromatic clay-pot biryani, and family fine dining in the heart of Vijayawada.", "+919848011111", "+919848011111", "contact@amravatigrand.in", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80", "APPROVED", 1, now, 1, 4.8, 124, 182, now, now);
            insertBizLoc.run("loc-biz-1", "biz-amravati", "city-vja", "loc-nahamar", "D.No 40-1-28, MG Road, Nahamar", "Near Benz Circle Flyover", "520008", 16.5120, 80.6515);
            insertBizCat.run("bcat-1", "biz-amravati", "cat-food", 1);
            insertBizOwner.run("bown-1", "biz-amravati", defaultVendor.id);
            for (let day = 0; day <= 6; day++) {
                insertHour.run(`hour-amr-${day}`, "biz-amravati", day, "10:30", "23:00", 0);
            }
            insertBiz.run("biz-siri-dental", "Siri Dental Clinic", "Dr. Siri Healthcare LLP", "siri-dental-clinic", "Advanced painless laser dentistry, invisible aligners, computerized root canals, and cosmetic dental surgery by renowned specialists.", "+919848033333", "+919848033333", "care@siridental.com", "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=150&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80", "APPROVED", 1, now, 1, 4.8, 132, 145, now, now);
            insertBizLoc.run("loc-biz-2", "biz-siri-dental", "city-vja", "loc-nahamar", "Plot 14, 2nd Cross, Nahamar Main Road", "Behind SBI Branch", "520008", 16.5135, 80.6522);
            insertBizCat.run("bcat-2", "biz-siri-dental", "cat-dental", 1);
            insertBizCat.run("bcat-2b", "biz-siri-dental", "cat-doctors", 0);
            insertBizOwner.run("bown-2", "biz-siri-dental", defaultVendor.id);
            for (let day = 1; day <= 6; day++) {
                insertHour.run(`hour-siri-${day}`, "biz-siri-dental", day, "09:00", "21:00", 0);
            }
            insertHour.run("hour-siri-0", "biz-siri-dental", 0, "10:00", "14:00", 0);
            insertBiz.run("biz-fernat-dental", "Fernat Dental Business", "Fernat Healthcare Services", "fernat-dental-business", "Modern dental care clinic offering complete oral checkups, scaling, pediatric dental solutions and implants.", "+919848044444", "+919848044444", "info@fernatdental.in", "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=150&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80", "APPROVED", 1, now, 0, 4.8, 96, 88, now, now);
            insertBizLoc.run("loc-biz-3", "biz-fernat-dental", "city-vja", "loc-benz", "Opposite Modern Mall, Benz Circle", "MG Road Junction", "520010", 16.5015, 80.6430);
            insertBizCat.run("bcat-3", "biz-fernat-dental", "cat-dental", 1);
            insertBizOwner.run("bown-3", "biz-fernat-dental", defaultVendor.id);
            for (let day = 1; day <= 6; day++) {
                insertHour.run(`hour-fernat-${day}`, "biz-fernat-dental", day, "09:30", "20:30", 0);
            }
            insertHour.run("hour-fernat-0", "biz-fernat-dental", 0, null, null, 1);
            insertBiz.run("biz-srinivasa-packers", "Srinivasa Packers & Movers", "Srinivasa Logistics Services", "srinivasa-packers-movers", "Top-rated packing and moving specialists in Guntur & Vijayawada. Safe household shifting, zero-damage vehicle moving & secure warehousing.", "+919848022222", "+919848022222", "support@srinivasapackers.in", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80", "APPROVED", 1, now, 1, 4.8, 89, 210, now, now);
            insertBizLoc.run("loc-biz-4", "biz-srinivasa-packers", "city-gun", "loc-brodipet", "Shop #7, 4/1 Brodipet Main Road", "Near Old Bus Stand", "522002", 16.3050, 80.4380);
            insertBizCat.run("bcat-4", "biz-srinivasa-packers", "cat-movers", 1);
            insertBizCat.run("bcat-4b", "biz-srinivasa-packers", "cat-home", 0);
            insertBizOwner.run("bown-4", "biz-srinivasa-packers", defaultVendor.id);
            for (let day = 0; day <= 6; day++) {
                insertHour.run(`hour-srini-${day}`, "biz-srinivasa-packers", day, "08:00", "22:00", 0);
            }
            insertBiz.run("biz-sri-lakshmi", "Sri Lakshmi Electrical & Plumbing", "Sri Lakshmi Technical Works", "sri-lakshmi-electrical-plumbing", "Certified professional technicians for domestic & industrial house wiring, inverter setups, bathroom fitting and pipe repairs.", "+919848055555", "+919848055555", "lakshmitechnical@hello-hi.in", "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80", "APPROVED", 1, now, 0, 4.9, 142, 176, now, now);
            insertBizLoc.run("loc-biz-5", "biz-sri-lakshmi", "city-vja", "loc-onetown", "Kaleswara Rao Market Street, One Town", "Near Kanaka Durga Temple Arch", "520001", 16.5180, 80.6190);
            insertBizCat.run("bcat-5", "biz-sri-lakshmi", "cat-electric", 1);
            insertBizCat.run("bcat-5b", "biz-sri-lakshmi", "cat-home", 0);
            insertBizOwner.run("bown-5", "biz-sri-lakshmi", defaultVendor.id);
            for (let day = 1; day <= 6; day++) {
                insertHour.run(`hour-laks-${day}`, "biz-sri-lakshmi", day, "08:30", "21:00", 0);
            }
            insertHour.run("hour-laks-0", "biz-sri-lakshmi", 0, "09:00", "14:00", 0);
            insertBiz.run("biz-balaji-tours", "Balaji Tours & Travel AP", "Balaji Travels Andhra Pradesh", "balaji-tours-travel-ap", "Complete travel solutions across Andhra Pradesh: Tirupati packages, Vijayawada to Hyderabad airport cabs, and luxury coach rentals.", "+919848066666", "+919848066666", "bookings@balajitravelsap.com", "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=150&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80", "APPROVED", 1, now, 0, 4.7, 64, 92, now, now);
            insertBizLoc.run("loc-biz-6", "biz-balaji-tours", "city-gun", "loc-arundelpet", "Complex B-4, 7th Line, Arundelpet", "Near Shankar Vilas Centre", "522002", 16.3120, 80.4320);
            insertBizCat.run("bcat-6", "biz-balaji-tours", "cat-tours", 1);
            insertBizOwner.run("bown-6", "biz-balaji-tours", defaultVendor.id);
            for (let day = 0; day <= 6; day++) {
                insertHour.run(`hour-balaji-${day}`, "biz-balaji-tours", day, "06:00", "23:00", 0);
            }
            const insertMedia = this.db.prepare("INSERT INTO business_media (id, business_id, media_url, media_type, sort_order) VALUES (?, ?, ?, ?, ?)");
            insertMedia.run("med-1", "biz-amravati", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80", "COVER", 1);
            insertMedia.run("med-2", "biz-amravati", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80", "IMAGE", 2);
            insertMedia.run("med-3", "biz-siri-dental", "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80", "COVER", 1);
            insertMedia.run("med-4", "biz-siri-dental", "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80", "IMAGE", 2);
            const insertReview = this.db.prepare("INSERT INTO reviews (id, business_id, user_id, rating, review_text, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'APPROVED', ?, ?)");
            insertReview.run("rev-1", "biz-amravati", defaultVendor.id, 5, "Unmatched taste in Vijayawada! The clay pot biryani and gongura mutton are outstanding.", now, now);
            insertReview.run("rev-2", "biz-amravati", defaultVendor.id, 5, "Very hygienic and family-friendly ambiance. Great service near Benz Circle.", now, now);
            insertReview.run("rev-3", "biz-siri-dental", defaultVendor.id, 5, "Extremely professional dental clinic. Painless root canal and great equipment.", now, now);
            insertReview.run("rev-4", "biz-srinivasa-packers", defaultVendor.id, 5, "Shifted our 3BHK from Guntur to Vijayawada safely without a single scratch. Highly recommended!", now, now);
        }
    }
    query(sql, params = []) {
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }
    queryOne(sql, params = []) {
        const stmt = this.db.prepare(sql);
        const result = stmt.get(...params);
        return result || null;
    }
    execute(sql, params = []) {
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);
        return {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
        };
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)()
], DatabaseService);
//# sourceMappingURL=database.service.js.map