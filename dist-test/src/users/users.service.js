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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const auth_service_1 = require("../auth/auth.service");
const crypto = require("node:crypto");
let UsersService = class UsersService {
    constructor(db, authService) {
        this.db = db;
        this.authService = authService;
    }
    getProfile(userId) {
        return this.authService.getUserProfile(userId);
    }
    updateProfile(userId, data) {
        const user = this.db.queryOne("SELECT * FROM users WHERE id = ?", [userId]);
        if (!user)
            throw new common_1.BadRequestException("User not found.");
        if (data.email && data.email !== user.email) {
            const existing = this.db.queryOne("SELECT id FROM users WHERE email = ? AND id != ?", [data.email, userId]);
            if (existing) {
                throw new common_1.BadRequestException("Email address is already in use by another account.");
            }
        }
        const now = new Date().toISOString();
        this.db.execute(`UPDATE users 
       SET full_name = COALESCE(?, full_name), 
           email = COALESCE(?, email), 
           avatar_url = COALESCE(?, avatar_url),
           preferred_language = COALESCE(?, preferred_language),
           locality_id = COALESCE(?, locality_id),
           updated_at = ?
       WHERE id = ?`, [
            data.fullName || null,
            data.email || null,
            data.avatarUrl || null,
            data.preferredLanguage || null,
            data.localityId || null,
            now,
            userId
        ]);
        return this.authService.getUserProfile(userId);
    }
    evaluateModeSwitch(userId, targetMode) {
        if (targetMode === "customer") {
            return {
                success: true,
                activeMode: "customer",
                canSwitch: true,
                message: "Switched to Customer Mode"
            };
        }
        const businesses = this.authService.getUserBusinesses(userId);
        if (businesses.length === 0) {
            return {
                success: false,
                activeMode: "customer",
                canSwitch: false,
                requiredAction: "REGISTER_BUSINESS",
                message: "Vendor mode requires at least one registered or claimed business. Please register your business first."
            };
        }
        return {
            success: true,
            activeMode: "vendor",
            canSwitch: true,
            primaryBusinessId: businesses[0].id,
            businesses,
            message: "Vendor Mode activated successfully"
        };
    }
    toggleSavedBusiness(userId, businessId) {
        const business = this.db.queryOne(`SELECT id, name FROM businesses WHERE id = ? AND status = 'APPROVED'`, [businessId]);
        if (!business) {
            throw new common_1.NotFoundException("Business not found");
        }
        const existing = this.db.queryOne(`SELECT id FROM saved_businesses WHERE user_id = ? AND business_id = ?`, [userId, businessId]);
        if (existing) {
            this.db.execute(`DELETE FROM saved_businesses WHERE id = ?`, [existing.id]);
            return {
                isSaved: false,
                businessId,
                message: `Removed ${business.name} from saved businesses`,
            };
        }
        else {
            const now = new Date().toISOString();
            const id = `save-${crypto.randomUUID()}`;
            this.db.execute(`INSERT INTO saved_businesses (id, user_id, business_id, created_at) VALUES (?, ?, ?, ?)`, [id, userId, businessId, now]);
            return {
                isSaved: true,
                businessId,
                message: `Saved ${business.name} to bookmarks`,
            };
        }
    }
    getSavedBusinesses(userId) {
        const rows = this.db.query(`
      SELECT 
        b.id, b.name, b.slug, b.description, b.primary_phone as primaryPhone,
        b.whatsapp_number as whatsappNumber, b.logo_url as logoUrl,
        b.cover_image_url as coverImageUrl, b.is_verified as isVerified,
        b.average_rating as averageRating, b.total_reviews as totalReviews,
        c.name as cityName, l.name as localityName,
        cat.name as categoryName,
        sb.created_at as savedAt
      FROM saved_businesses sb
      JOIN businesses b ON b.id = sb.business_id
      JOIN business_locations bl ON bl.business_id = b.id AND bl.is_primary = 1
      JOIN cities c ON c.id = bl.city_id
      LEFT JOIN localities l ON l.id = bl.locality_id
      JOIN business_categories bc ON bc.business_id = b.id AND bc.is_primary = 1
      JOIN categories cat ON cat.id = bc.category_id
      WHERE sb.user_id = ?
      ORDER BY sb.created_at DESC
    `, [userId]);
        return rows;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        auth_service_1.AuthService])
], UsersService);
//# sourceMappingURL=users.service.js.map