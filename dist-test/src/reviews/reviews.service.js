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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const crypto = require("node:crypto");
let ReviewsService = class ReviewsService {
    constructor(db) {
        this.db = db;
    }
    addOrUpdateReview(input) {
        if (!input.businessId) {
            throw new common_1.BadRequestException("Business ID is required");
        }
        if (!input.rating || input.rating < 1 || input.rating > 5) {
            throw new common_1.BadRequestException("Rating must be an integer between 1 and 5");
        }
        const business = this.db.queryOne(`SELECT id, name FROM businesses WHERE id = ? AND status = 'APPROVED'`, [input.businessId]);
        if (!business) {
            throw new common_1.NotFoundException("Business not found");
        }
        const now = new Date().toISOString();
        const existing = this.db.queryOne(`SELECT id FROM reviews WHERE business_id = ? AND user_id = ?`, [input.businessId, input.userId]);
        let reviewId;
        if (existing) {
            reviewId = existing.id;
            this.db.execute(`UPDATE reviews SET rating = ?, review_text = ?, updated_at = ? WHERE id = ?`, [input.rating, input.reviewText || null, now, reviewId]);
        }
        else {
            reviewId = `rev-${crypto.randomUUID()}`;
            this.db.execute(`INSERT INTO reviews (id, business_id, user_id, rating, review_text, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'APPROVED', ?, ?)`, [reviewId, input.businessId, input.userId, input.rating, input.reviewText || null, now, now]);
        }
        const stats = this.db.queryOne(`SELECT AVG(rating) as avgRating, COUNT(*) as cnt FROM reviews WHERE business_id = ? AND status = 'APPROVED'`, [input.businessId]);
        const newAvg = stats && stats.avgRating ? Math.round(Number(stats.avgRating) * 10) / 10 : input.rating;
        const newCount = stats && stats.cnt ? Number(stats.cnt) : 1;
        this.db.execute(`UPDATE businesses SET average_rating = ?, total_reviews = ? WHERE id = ?`, [newAvg, newCount, input.businessId]);
        return {
            id: reviewId,
            businessId: input.businessId,
            userId: input.userId,
            rating: input.rating,
            reviewText: input.reviewText,
            newAverageRating: newAvg,
            totalReviews: newCount,
            updatedAt: now,
        };
    }
    getBusinessReviews(businessId) {
        const reviews = this.db.query(`
      SELECT 
        r.id, r.rating, r.review_text as reviewText, r.created_at as createdAt,
        u.id as userId, u.full_name as authorName, u.avatar_url as authorAvatar
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.business_id = ? AND r.status = 'APPROVED'
      ORDER BY r.created_at DESC
    `, [businessId]);
        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
            const star = Math.min(5, Math.max(1, Math.round(r.rating)));
            breakdown[star] = (breakdown[star] || 0) + 1;
        });
        return {
            reviews,
            total: reviews.length,
            breakdown,
        };
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map