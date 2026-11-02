import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import * as crypto from "node:crypto";

export interface CreateReviewInput {
  businessId: string;
  userId: string;
  rating: number;
  reviewText?: string;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly db: DatabaseService) {}

  addOrUpdateReview(input: CreateReviewInput) {
    if (!input.businessId) {
      throw new BadRequestException("Business ID is required");
    }
    if (!input.rating || input.rating < 1 || input.rating > 5) {
      throw new BadRequestException("Rating must be an integer between 1 and 5");
    }

    const business = this.db.queryOne<any>(
      `SELECT id, name FROM businesses WHERE id = ? AND status = 'APPROVED'`,
      [input.businessId]
    );

    if (!business) {
      throw new NotFoundException("Business not found");
    }

    const now = new Date().toISOString();

    // Check if user already reviewed
    const existing = this.db.queryOne<any>(
      `SELECT id FROM reviews WHERE business_id = ? AND user_id = ?`,
      [input.businessId, input.userId]
    );

    let reviewId: string;
    if (existing) {
      reviewId = existing.id;
      this.db.execute(
        `UPDATE reviews SET rating = ?, review_text = ?, updated_at = ? WHERE id = ?`,
        [input.rating, input.reviewText || null, now, reviewId]
      );
    } else {
      reviewId = `rev-${crypto.randomUUID()}`;
      this.db.execute(
        `INSERT INTO reviews (id, business_id, user_id, rating, review_text, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'APPROVED', ?, ?)`,
        [reviewId, input.businessId, input.userId, input.rating, input.reviewText || null, now, now]
      );
    }

    // Recalculate average rating
    const stats = this.db.queryOne<any>(
      `SELECT AVG(rating) as avgRating, COUNT(*) as cnt FROM reviews WHERE business_id = ? AND status = 'APPROVED'`,
      [input.businessId]
    );

    const newAvg = stats && stats.avgRating ? Math.round(Number(stats.avgRating) * 10) / 10 : input.rating;
    const newCount = stats && stats.cnt ? Number(stats.cnt) : 1;

    this.db.execute(
      `UPDATE businesses SET average_rating = ?, total_reviews = ? WHERE id = ?`,
      [newAvg, newCount, input.businessId]
    );

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

  getBusinessReviews(businessId: string) {
    const reviews = this.db.query<any>(`
      SELECT 
        r.id, r.rating, r.review_text as reviewText, r.created_at as createdAt,
        u.id as userId, u.full_name as authorName, u.avatar_url as authorAvatar
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.business_id = ? AND r.status = 'APPROVED'
      ORDER BY r.created_at DESC
    `, [businessId]);

    // Breakdown
    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r: any) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      breakdown[star] = (breakdown[star] || 0) + 1;
    });

    return {
      reviews,
      total: reviews.length,
      breakdown,
    };
  }
}

