"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessesService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let BusinessesService = class BusinessesService {
    constructor(db) {
        this.db = db;
    }
    computeHaversineDistanceKm(lat1, lon1, lat2, lon2) {
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 10) / 10;
    }
    checkIsOpenNow(hours) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = String(now.getHours()).padStart(2, "0");
        const currentMin = String(now.getMinutes()).padStart(2, "0");
        const currentTime = `${currentHour}:${currentMin}`;
        const todayHour = hours.find((h) => h.day_of_week === currentDay);
        if (!todayHour || todayHour.is_closed === 1 || !todayHour.opens_at || !todayHour.closes_at) {
            return {
                isOpenNow: false,
                todaySummary: "Closed today",
            };
        }
        const isOpen = currentTime >= todayHour.opens_at && currentTime <= todayHour.closes_at;
        return {
            isOpenNow: isOpen,
            todaySummary: `${isOpen ? "Open today" : "Closed now"} (${todayHour.opens_at} - ${todayHour.closes_at})`,
        };
    }
    searchBusinesses(filters) {
        const page = Math.max(1, filters.page || 1);
        const limit = Math.max(1, Math.min(50, filters.limit || 10));
        const offset = (page - 1) * limit;
        let baseSql = `
      SELECT 
        b.id, b.name, b.slug, b.description, b.primary_phone as primaryPhone,
        b.whatsapp_number as whatsappNumber, b.logo_url as logoUrl,
        b.cover_image_url as coverImageUrl, b.is_verified as isVerified,
        b.is_featured as isFeatured, b.average_rating as averageRating,
        b.total_reviews as totalReviews, b.total_enquiries as totalEnquiries,
        c.name as cityName, c.slug as citySlug,
        l.name as localityName, l.slug as localitySlug, l.pincode,
        bl.address_line1 as addressLine1, bl.landmark,
        bl.latitude, bl.longitude,
        cat.id as categoryId, cat.name as categoryName, cat.slug as categorySlug
      FROM businesses b
      JOIN business_locations bl ON bl.business_id = b.id AND bl.is_primary = 1
      JOIN cities c ON c.id = bl.city_id
      LEFT JOIN localities l ON l.id = bl.locality_id
      JOIN business_categories bc ON bc.business_id = b.id AND bc.is_primary = 1
      JOIN categories cat ON cat.id = bc.category_id
      WHERE b.status = 'APPROVED'
    `;
        const params = [];
        if (filters.q && filters.q.trim()) {
            const searchTerm = `%${filters.q.trim().toLowerCase()}%`;
            baseSql += ` AND (
        LOWER(b.name) LIKE ? OR 
        LOWER(b.description) LIKE ? OR 
        LOWER(cat.name) LIKE ? OR
        EXISTS (
          SELECT 1 FROM services s 
          WHERE s.category_id = cat.id AND LOWER(s.name) LIKE ?
        )
      )`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        if (filters.citySlug) {
            baseSql += ` AND c.slug = ?`;
            params.push(filters.citySlug.toLowerCase());
        }
        if (filters.localitySlug) {
            baseSql += ` AND l.slug = ?`;
            params.push(filters.localitySlug.toLowerCase());
        }
        if (filters.categorySlug) {
            const catSlug = filters.categorySlug.toLowerCase();
            const aliasMap = {
                "restaurants": ["restaurants", "restaurants-food", "cat-restaurants", "cat-food"],
                "restaurants-food": ["restaurants", "restaurants-food", "cat-restaurants", "cat-food"],
                "dentists": ["dentists", "dental-care", "cat-dentists", "cat-dental"],
                "dental-care": ["dentists", "dental-care", "cat-dentists", "cat-dental"],
                "rent-hire": ["rent-hire", "cat-rent-hire", "packers-movers", "cat-movers", "tours-travel", "cat-tours"],
                "contractors": ["contractors", "cat-contractors", "electrical-plumbing", "cat-electric"],
                "hospitals": ["hospitals", "cat-hospitals", "doctors-clinics", "cat-doctors"],
                "beauty-spa": ["beauty-spa", "cat-beauty-spa"],
                "home-decor": ["home-decor", "cat-home-decor", "home-services", "cat-home"],
                "ask-astro": ["ask-astro", "cat-ask-astro"],
                "wedding-planning": ["wedding-planning", "cat-wedding-planning"],
                "education": ["education", "cat-education"],
                "pet-shops": ["pet-shops", "cat-pet-shops"],
                "pg-hostels": ["pg-hostels", "cat-pg-hostels"],
                "estate-agent": ["estate-agent", "cat-estate-agent"],
                "hotels": ["hotels", "cat-hotels"],
            };
            const targetMatches = aliasMap[catSlug] || [catSlug, `cat-${catSlug}`];
            const placeholders = targetMatches.map(() => "?").join(", ");
            baseSql += ` AND (cat.slug IN (${placeholders}) OR cat.id IN (${placeholders}))`;
            params.push(...targetMatches, ...targetMatches);
        }
        if (filters.minRating) {
            baseSql += ` AND b.average_rating >= ?`;
            params.push(filters.minRating);
        }
        if (filters.verifiedOnly) {
            baseSql += ` AND b.is_verified = 1`;
        }
        const allRows = this.db.query(baseSql, params);
        const enriched = allRows.map((row) => {
            let distanceKm;
            if (filters.userLat && filters.userLng) {
                distanceKm = this.computeHaversineDistanceKm(filters.userLat, filters.userLng, row.latitude, row.longitude);
            }
            const hours = this.db.query(`SELECT day_of_week, opens_at, closes_at, is_closed FROM business_hours WHERE business_id = ?`, [row.id]);
            const { isOpenNow, todaySummary } = this.checkIsOpenNow(hours);
            return {
                id: row.id,
                name: row.name,
                slug: row.slug,
                description: row.description,
                logoUrl: row.logoUrl,
                coverImageUrl: row.coverImageUrl,
                isVerified: Boolean(row.isVerified),
                isFeatured: Boolean(row.isFeatured),
                isOpenNow,
                workingHoursSummary: todaySummary,
                averageRating: Number(row.averageRating),
                totalReviews: Number(row.totalReviews),
                totalEnquiries: Number(row.totalEnquiries),
                primaryCategory: {
                    id: row.categoryId,
                    name: row.categoryName,
                    slug: row.categorySlug,
                },
                location: {
                    addressLine1: row.addressLine1,
                    landmark: row.landmark,
                    localityName: row.localityName || "",
                    localitySlug: row.localitySlug || "",
                    cityName: row.cityName,
                    citySlug: row.citySlug,
                    pincode: row.pincode,
                    distanceKm,
                    latitude: Number(row.latitude),
                    longitude: Number(row.longitude),
                },
                contacts: {
                    callNumber: row.primaryPhone,
                    whatsappNumber: row.whatsappNumber,
                },
            };
        });
        let filtered = enriched;
        if (filters.openNow) {
            filtered = filtered.filter((item) => item.isOpenNow);
        }
        if (filters.sortBy === "distance" && filters.userLat && filters.userLng) {
            filtered.sort((a, b) => (a.location.distanceKm ?? 99999) - (b.location.distanceKm ?? 99999));
        }
        else if (filters.sortBy === "rating") {
            filtered.sort((a, b) => b.averageRating - a.averageRating);
        }
        else {
            filtered.sort((a, b) => {
                if (a.isFeatured !== b.isFeatured)
                    return a.isFeatured ? -1 : 1;
                if (b.averageRating !== a.averageRating)
                    return b.averageRating - a.averageRating;
                return b.totalEnquiries - a.totalEnquiries;
            });
        }
        const totalRecords = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);
        return {
            items: paginated,
            meta: {
                page,
                limit,
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit),
                hasNextPage: page * limit < totalRecords,
            },
        };
    }
    getBusinessBySlug(slugOrId, userLat, userLng) {
        const biz = this.db.queryOne(`
      SELECT 
        b.id, b.name, b.legal_name as legalName, b.slug, b.description,
        b.primary_phone as primaryPhone, b.whatsapp_number as whatsappNumber,
        b.support_email as supportEmail, b.logo_url as logoUrl,
        b.cover_image_url as coverImageUrl, b.status, b.is_verified as isVerified,
        b.is_featured as isFeatured, b.average_rating as averageRating,
        b.total_reviews as totalReviews, b.total_enquiries as totalEnquiries,
        b.created_at as createdAt
      FROM businesses b
      WHERE (b.slug = ? OR b.id = ?) AND b.status = 'APPROVED'
    `, [slugOrId, slugOrId]);
        if (!biz) {
            throw new common_1.NotFoundException(`Business '${slugOrId}' not found`);
        }
        const locations = this.db.query(`
      SELECT 
        bl.id, bl.address_line1 as addressLine1, bl.landmark, bl.pincode,
        bl.latitude, bl.longitude, bl.is_primary as isPrimary,
        c.id as cityId, c.name as cityName, c.slug as citySlug,
        l.id as localityId, l.name as localityName, l.slug as localitySlug
      FROM business_locations bl
      JOIN cities c ON c.id = bl.city_id
      LEFT JOIN localities l ON l.id = bl.locality_id
      WHERE bl.business_id = ?
      ORDER BY bl.is_primary DESC
    `, [biz.id]);
        const primaryLoc = locations[0];
        let distanceKm;
        if (userLat && userLng && primaryLoc) {
            distanceKm = this.computeHaversineDistanceKm(userLat, userLng, primaryLoc.latitude, primaryLoc.longitude);
        }
        const categories = this.db.query(`
      SELECT c.id, c.name, c.slug, c.icon_name as iconName, bc.is_primary as isPrimary
      FROM business_categories bc
      JOIN categories c ON c.id = bc.category_id
      WHERE bc.business_id = ?
      ORDER BY bc.is_primary DESC
    `, [biz.id]);
        const hours = this.db.query(`
      SELECT day_of_week as dayOfWeek, opens_at as opensAt, closes_at as closesAt, is_closed as isClosed
      FROM business_hours
      WHERE business_id = ?
      ORDER BY day_of_week ASC
    `, [biz.id]);
        const { isOpenNow, todaySummary } = this.checkIsOpenNow(hours.map((h) => ({
            day_of_week: h.dayOfWeek,
            opens_at: h.opensAt,
            closes_at: h.closesAt,
            is_closed: h.isClosed,
        })));
        const media = this.db.query(`
      SELECT id, media_url as mediaUrl, media_type as mediaType, sort_order as sortOrder
      FROM business_media
      WHERE business_id = ?
      ORDER BY sort_order ASC
    `, [biz.id]);
        const reviews = this.db.query(`
      SELECT 
        r.id, r.rating, r.review_text as reviewText, r.created_at as createdAt,
        u.full_name as authorName, u.avatar_url as authorAvatar
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.business_id = ? AND r.status = 'APPROVED'
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [biz.id]);
        return {
            id: biz.id,
            name: biz.name,
            legalName: biz.legalName,
            slug: biz.slug,
            description: biz.description,
            logoUrl: biz.logoUrl,
            coverImageUrl: biz.coverImageUrl,
            isVerified: Boolean(biz.isVerified),
            isFeatured: Boolean(biz.isFeatured),
            isOpenNow,
            workingHoursSummary: todaySummary,
            averageRating: Number(biz.averageRating),
            totalReviews: Number(biz.totalReviews),
            totalEnquiries: Number(biz.totalEnquiries),
            contacts: {
                primaryPhone: biz.primaryPhone,
                whatsappNumber: biz.whatsappNumber,
                supportEmail: biz.supportEmail,
            },
            locations: locations.map((loc) => ({
                ...loc,
                isPrimary: Boolean(loc.isPrimary),
                distanceKm,
            })),
            categories: categories.map((cat) => ({
                ...cat,
                isPrimary: Boolean(cat.isPrimary),
            })),
            hours,
            media,
            reviews,
        };
    }
    getSuggestions(query, citySlug) {
        if (!query || query.trim().length < 2) {
            return { businesses: [], categories: [], localities: [] };
        }
        const term = `%${query.trim().toLowerCase()}%`;
        const businesses = this.db.query(`
      SELECT b.id, b.name, b.slug, c.name as cityName
      FROM businesses b
      JOIN business_locations bl ON bl.business_id = b.id AND bl.is_primary = 1
      JOIN cities c ON c.id = bl.city_id
      WHERE b.status = 'APPROVED' AND LOWER(b.name) LIKE ?
      LIMIT 5
    `, [term]);
        const categories = this.db.query(`
      SELECT id, name, slug, icon_name as iconName
      FROM categories
      WHERE is_active = 1 AND LOWER(name) LIKE ?
      LIMIT 5
    `, [term]);
        const localities = this.db.query(`
      SELECT l.id, l.name, l.slug, c.name as cityName, c.slug as citySlug
      FROM localities l
      JOIN cities c ON c.id = l.city_id
      WHERE l.is_active = 1 AND LOWER(l.name) LIKE ?
      LIMIT 5
    `, [term]);
        return {
            businesses,
            categories,
            localities,
        };
    }
    registerVendorBusiness(userId, data) {
        if (!data.name || !data.categoryId || !data.cityId) {
            throw new Error("Business name, primary category, and city are required.");
        }
        const now = new Date().toISOString();
        const businessId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const baseSlug = data.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        const primaryPhone = data.primaryPhone || data.phone || "+919848012345";
        this.db.execute(`
      INSERT INTO businesses (id, name, legal_name, slug, description, primary_phone, whatsapp_number, support_email, is_verified, status, average_rating, total_reviews, total_enquiries, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING', 0.0, 0, 0, ?, ?)
    `, [
            businessId,
            data.name,
            data.legalName || data.name,
            slug,
            data.description || null,
            primaryPhone,
            data.whatsappNumber || primaryPhone,
            data.supportEmail || null,
            now,
            now
        ]);
        const locId = `loc_${Date.now()}`;
        const lat = data.latitude ? parseFloat(data.latitude) : 16.5062;
        const lng = data.longitude ? parseFloat(data.longitude) : 80.6480;
        this.db.execute(`
      INSERT INTO business_locations (id, business_id, city_id, locality_id, address_line1, landmark, pincode, latitude, longitude, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
            locId,
            businessId,
            data.cityId,
            data.localityId || null,
            data.addressLine1 || data.name,
            data.landmark || null,
            data.pincode || "520001",
            lat,
            lng
        ]);
        const catLinkId = `bcat_${Date.now()}`;
        this.db.execute(`
      INSERT INTO business_categories (id, business_id, category_id, is_primary)
      VALUES (?, ?, ?, 1)
    `, [catLinkId, businessId, data.categoryId]);
        const ownerLinkId = `bo_${Date.now()}`;
        this.db.execute(`
      INSERT INTO business_owners (id, business_id, user_id, ownership_type)
      VALUES (?, ?, ?, 'PRIMARY_OWNER')
    `, [ownerLinkId, businessId, userId]);
        const vendorRole = this.db.queryOne("SELECT id FROM roles WHERE name = 'VENDOR_OWNER'");
        if (vendorRole) {
            const existingPerm = this.db.queryOne("SELECT id FROM user_permissions WHERE user_id = ? AND role_id = ?", [userId, vendorRole.id]);
            if (!existingPerm) {
                this.db.execute(`
          INSERT INTO user_permissions (id, user_id, role_id)
          VALUES (?, ?, ?)
        `, [`perm_${Date.now()}`, userId, vendorRole.id]);
            }
        }
        this.db.execute(`
      INSERT INTO notifications (id, title, message, type, recipient, is_read, related_entity, related_id, created_at)
      VALUES (?, ?, ?, 'KYC_VERIFICATION', 'Super Admin', 0, 'businesses', ?, ?)
    `, [
            `notif_${Date.now()}`,
            `New Vendor Registration: ${data.name}`,
            `A new business "${data.name}" has been registered by vendor and is awaiting verification.`,
            businessId,
            now
        ]);
        return {
            businessId,
            name: data.name,
            slug,
            status: "PENDING",
            isVerified: false,
            message: "Business registered successfully and submitted for administrator verification."
        };
    }
    getVendorRegistrationStatus(userId) {
        return this.db.query(`
      SELECT b.id, b.name, b.slug, b.status, b.is_verified as isVerified, b.created_at as createdAt,
             c.name as cityName, cat.name as categoryName
      FROM business_owners bo
      JOIN businesses b ON bo.business_id = b.id
      LEFT JOIN business_locations bl ON bl.business_id = b.id AND bl.is_primary = 1
      LEFT JOIN cities c ON c.id = bl.city_id
      LEFT JOIN business_categories bc ON bc.business_id = b.id AND bc.is_primary = 1
      LEFT JOIN categories cat ON cat.id = bc.category_id
      WHERE bo.user_id = ?
      ORDER BY b.created_at DESC
    `, [userId]);
    }
};
exports.BusinessesService = BusinessesService;
exports.BusinessesService = BusinessesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], BusinessesService);
//# sourceMappingURL=businesses.service.js.map