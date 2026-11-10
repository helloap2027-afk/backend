import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface CreateCategoryDto {
  title: string;
  subtitle?: string;
  slug?: string;
  icon?: string;
  audience: "CUSTOMER" | "BUSINESS_PARTNER" | "GENERAL";
  displayOrder?: number;
  status?: "PUBLISHED" | "DRAFT";
}

export interface UpdateCategoryDto {
  title?: string;
  subtitle?: string;
  slug?: string;
  icon?: string;
  audience?: "CUSTOMER" | "BUSINESS_PARTNER" | "GENERAL";
  displayOrder?: number;
  status?: "PUBLISHED" | "DRAFT";
}

export interface CreateArticleDto {
  categoryId: string;
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  audience: "CUSTOMER" | "BUSINESS_PARTNER" | "GENERAL";
  searchKeywords?: string;
  isPopular?: boolean;
  status?: "PUBLISHED" | "DRAFT";
  displayOrder?: number;
}

export interface UpdateArticleDto {
  categoryId?: string;
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  audience?: "CUSTOMER" | "BUSINESS_PARTNER" | "GENERAL";
  searchKeywords?: string;
  isPopular?: boolean;
  status?: "PUBLISHED" | "DRAFT";
  displayOrder?: number;
}

export interface CreateTicketDto {
  category: string;
  subject: string;
  description: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  businessId?: string;
}

@Injectable()
export class HelpCenterService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Helper to normalize requested audience into allowable database values.
   */
  private resolveAudienceFilter(audience?: string): string[] {
    const aud = (audience || "").toUpperCase().trim();
    if (aud === "CUSTOMER") {
      return ["CUSTOMER", "GENERAL"];
    }
    if (aud === "BUSINESS_PARTNER" || aud === "MERCHANT" || aud === "PARTNER") {
      return ["BUSINESS_PARTNER", "GENERAL"];
    }
    if (aud === "ALL" || aud === "GUEST") {
      return ["CUSTOMER", "BUSINESS_PARTNER", "GENERAL"];
    }
    return ["GENERAL"];
  }

  // =========================================================================
  // PUBLIC / ROLE-BASED CONSUMER APIS
  // =========================================================================

  /**
   * Get complete overview for the target audience:
   * Returns categories, popular articles, and active support channels.
   */
  getOverview(audience: string = "GUEST") {
    const allowedAudiences = this.resolveAudienceFilter(audience);
    const placeholders = allowedAudiences.map(() => "?").join(",");

    // Categories
    const categories = this.db.query<any>(
      `SELECT c.id, c.title, c.subtitle, c.slug, c.icon, c.audience, c.display_order as displayOrder,
              (SELECT COUNT(*) FROM help_articles a WHERE a.category_id = c.id AND a.status = 'PUBLISHED' AND a.audience IN (${placeholders})) as articleCount
       FROM help_categories c
       WHERE c.status = 'PUBLISHED' AND c.audience IN (${placeholders})
       ORDER BY c.display_order ASC, c.title ASC`,
      [...allowedAudiences, ...allowedAudiences]
    );

    // Popular Articles
    const popularArticles = this.db.query<any>(
      `SELECT a.id, a.category_id as categoryId, a.title, a.slug, a.summary, a.audience,
              a.views_count as viewsCount, a.helpful_count as helpfulCount, a.display_order as displayOrder,
              c.title as categoryTitle, c.slug as categorySlug, c.icon as categoryIcon
       FROM help_articles a
       JOIN help_categories c ON c.id = a.category_id
       WHERE a.status = 'PUBLISHED' AND a.is_popular = 1 AND a.audience IN (${placeholders})
       ORDER BY a.display_order ASC, a.views_count DESC
       LIMIT 10`,
      allowedAudiences
    );

    // Support Channels
    const supportChannels = this.getSupportChannels(audience);

    return {
      audience,
      categories,
      popularArticles,
      supportChannels,
    };
  }

  /**
   * Get categories filtered by audience
   */
  getCategories(audience: string = "ALL") {
    const allowedAudiences = this.resolveAudienceFilter(audience);
    const placeholders = allowedAudiences.map(() => "?").join(",");

    return this.db.query<any>(
      `SELECT c.id, c.title, c.subtitle, c.slug, c.icon, c.audience, c.display_order as displayOrder,
              (SELECT COUNT(*) FROM help_articles a WHERE a.category_id = c.id AND a.status = 'PUBLISHED') as articleCount
       FROM help_categories c
       WHERE c.status = 'PUBLISHED' AND c.audience IN (${placeholders})
       ORDER BY c.display_order ASC, c.title ASC`,
      allowedAudiences
    );
  }

  /**
   * Get published articles by audience and optional category
   */
  getArticles(audience: string = "ALL", categoryIdOrSlug?: string, isPopularOnly?: boolean) {
    const allowedAudiences = this.resolveAudienceFilter(audience);
    const placeholders = allowedAudiences.map(() => "?").join(",");

    let sql = `
      SELECT a.id, a.category_id as categoryId, a.title, a.slug, a.summary, a.audience,
             a.is_popular as isPopular, a.views_count as viewsCount, a.helpful_count as helpfulCount,
             a.updated_at as updatedAt, c.title as categoryTitle, c.slug as categorySlug, c.icon as categoryIcon
      FROM help_articles a
      JOIN help_categories c ON c.id = a.category_id
      WHERE a.status = 'PUBLISHED' AND a.audience IN (${placeholders})
    `;
    const params: any[] = [...allowedAudiences];

    if (categoryIdOrSlug) {
      sql += ` AND (c.id = ? OR c.slug = ?)`;
      params.push(categoryIdOrSlug, categoryIdOrSlug);
    }

    if (isPopularOnly) {
      sql += ` AND a.is_popular = 1`;
    }

    sql += ` ORDER BY a.display_order ASC, a.views_count DESC`;

    return this.db.query<any>(sql, params);
  }

  /**
   * Get single article details by slug with related articles
   */
  getArticleBySlug(slug: string, audience: string = "ALL") {
    const allowedAudiences = this.resolveAudienceFilter(audience);
    const placeholders = allowedAudiences.map(() => "?").join(",");

    const article = this.db.queryOne<any>(
      `SELECT a.*, c.title as categoryTitle, c.slug as categorySlug, c.icon as categoryIcon
       FROM help_articles a
       JOIN help_categories c ON c.id = a.category_id
       WHERE a.slug = ? AND a.status = 'PUBLISHED' AND a.audience IN (${placeholders})`,
      [slug, ...allowedAudiences]
    );

    if (!article) {
      throw new NotFoundException(`Help article '${slug}' not found for audience '${audience}'`);
    }

    // Increment view count asynchronously
    try {
      this.db.execute(`UPDATE help_articles SET views_count = views_count + 1 WHERE id = ?`, [article.id]);
    } catch {}

    // Fetch related articles in same category
    const related = this.db.query<any>(
      `SELECT id, title, slug, summary, audience, views_count as viewsCount
       FROM help_articles
       WHERE category_id = ? AND id != ? AND status = 'PUBLISHED' AND audience IN (${placeholders})
       ORDER BY display_order ASC, views_count DESC
       LIMIT 4`,
      [article.category_id, article.id, ...allowedAudiences]
    );

    return {
      ...article,
      relatedArticles: related,
    };
  }

  /**
   * Record helpful or not-helpful feedback
   */
  submitArticleFeedback(slug: string, isHelpful: boolean) {
    const col = isHelpful ? "helpful_count" : "not_helpful_count";
    this.db.execute(`UPDATE help_articles SET ${col} = ${col} + 1 WHERE slug = ?`, [slug]);
    return { success: true, message: "Feedback recorded. Thank you!" };
  }

  /**
   * Real server-side fulltext search against database
   */
  search(query: string, audience: string = "ALL", limit: number = 20) {
    const q = (query || "").trim();
    if (q.length < 2) return [];

    const allowedAudiences = this.resolveAudienceFilter(audience);
    const placeholders = allowedAudiences.map(() => "?").join(",");
    const searchPattern = `%${q}%`;

    return this.db.query<any>(
      `SELECT a.id, a.title, a.slug, a.summary, a.audience, a.views_count as viewsCount,
              c.title as categoryTitle, c.slug as categorySlug, c.icon as categoryIcon
       FROM help_articles a
       JOIN help_categories c ON c.id = a.category_id
       WHERE a.status = 'PUBLISHED'
         AND a.audience IN (${placeholders})
         AND (
           a.title LIKE ? OR
           a.summary LIKE ? OR
           a.content LIKE ? OR
           a.search_keywords LIKE ? OR
           c.title LIKE ?
         )
       ORDER BY
         CASE WHEN a.title LIKE ? THEN 1 ELSE 2 END,
         a.views_count DESC
       LIMIT ?`,
      [
        ...allowedAudiences,
        searchPattern, searchPattern, searchPattern, searchPattern, searchPattern,
        searchPattern,
        limit
      ]
    );
  }

  /**
   * Get active support contact channels
   */
  getSupportChannels(audience: string = "ALL") {
    const allowedAudiences = this.resolveAudienceFilter(audience);
    const placeholders = allowedAudiences.map(() => "?").join(",");

    return this.db.query<any>(
      `SELECT id, channel_type as channelType, label, value, audience, display_order as displayOrder
       FROM support_channels
       WHERE is_active = 1 AND audience IN (${placeholders})
       ORDER BY display_order ASC`,
      allowedAudiences
    );
  }

  // =========================================================================
  // SUPPORT TICKETS (Authenticated)
  // =========================================================================

  createTicket(dto: CreateTicketDto, user: { id: string; role: string; fullName?: string; phoneNumber?: string }) {
    if (!dto.category || !dto.subject || !dto.description) {
      throw new BadRequestException("Category, subject, and description are mandatory");
    }

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();
    const audience = user.role === "MERCHANT" || user.role === "VENDOR_OWNER" || user.role === "VENDOR_STAFF" ? "BUSINESS_PARTNER" : "CUSTOMER";

    this.db.execute(
      `INSERT INTO support_tickets (id, ticket_number, user_id, business_id, audience, category, subject, description, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)`,
      [
        ticketId,
        ticketNumber,
        user.id,
        dto.businessId || null,
        audience,
        dto.category,
        dto.subject,
        dto.description,
        dto.priority || "NORMAL",
        now,
        now,
      ]
    );

    return {
      id: ticketId,
      ticketNumber,
      status: "OPEN",
      message: "Support ticket registered successfully. Our representative will contact you within 24 hours.",
    };
  }

  getUserTickets(userId: string) {
    return this.db.query<any>(
      `SELECT id, ticket_number as ticketNumber, audience, category, subject, description, status, priority, created_at as createdAt, updated_at as updatedAt
       FROM support_tickets
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  // =========================================================================
  // ADMIN MANAGEMENT (CRUD)
  // =========================================================================

  adminGetAllCategories() {
    return this.db.query<any>(
      `SELECT c.*,
              (SELECT COUNT(*) FROM help_articles a WHERE a.category_id = c.id) as articleCount
       FROM help_categories c
       ORDER BY c.audience ASC, c.display_order ASC`
    );
  }

  adminCreateCategory(dto: CreateCategoryDto) {
    const id = `hcat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const slug = dto.slug || dto.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const now = new Date().toISOString();

    this.db.execute(
      `INSERT INTO help_categories (id, title, subtitle, slug, icon, audience, display_order, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.title,
        dto.subtitle || "",
        slug,
        dto.icon || "HelpCircle",
        dto.audience || "GENERAL",
        dto.displayOrder || 0,
        dto.status || "PUBLISHED",
        now,
        now,
      ]
    );

    return { id, slug, ...dto };
  }

  adminUpdateCategory(id: string, dto: UpdateCategoryDto) {
    const existing = this.db.queryOne<any>(`SELECT * FROM help_categories WHERE id = ?`, [id]);
    if (!existing) throw new NotFoundException(`Category not found`);

    const updatedTitle = dto.title ?? existing.title;
    const updatedSubtitle = dto.subtitle ?? existing.subtitle;
    const updatedSlug = dto.slug ?? existing.slug;
    const updatedIcon = dto.icon ?? existing.icon;
    const updatedAudience = dto.audience ?? existing.audience;
    const updatedOrder = dto.displayOrder ?? existing.display_order;
    const updatedStatus = dto.status ?? existing.status;
    const now = new Date().toISOString();

    this.db.execute(
      `UPDATE help_categories
       SET title = ?, subtitle = ?, slug = ?, icon = ?, audience = ?, display_order = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [updatedTitle, updatedSubtitle, updatedSlug, updatedIcon, updatedAudience, updatedOrder, updatedStatus, now, id]
    );

    return { id, success: true };
  }

  adminDeleteCategory(id: string) {
    this.db.execute(`DELETE FROM help_categories WHERE id = ?`, [id]);
    return { success: true };
  }

  adminGetAllArticles(audience?: string, categoryId?: string) {
    let sql = `
      SELECT a.*, c.title as categoryTitle, c.slug as categorySlug
      FROM help_articles a
      JOIN help_categories c ON c.id = a.category_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (audience && audience !== "ALL") {
      sql += ` AND a.audience = ?`;
      params.push(audience);
    }
    if (categoryId) {
      sql += ` AND a.category_id = ?`;
      params.push(categoryId);
    }
    sql += ` ORDER BY a.created_at DESC`;
    return this.db.query<any>(sql, params);
  }

  adminCreateArticle(dto: CreateArticleDto) {
    const id = `hart_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const slug = dto.slug || dto.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const now = new Date().toISOString();

    this.db.execute(
      `INSERT INTO help_articles (id, category_id, title, slug, summary, content, audience, search_keywords, is_popular, views_count, helpful_count, not_helpful_count, status, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?)`,
      [
        id,
        dto.categoryId,
        dto.title,
        slug,
        dto.summary || "",
        dto.content,
        dto.audience || "GENERAL",
        dto.searchKeywords || "",
        dto.isPopular ? 1 : 0,
        dto.status || "PUBLISHED",
        dto.displayOrder || 0,
        now,
        now,
      ]
    );

    return { id, slug, ...dto };
  }

  adminUpdateArticle(id: string, dto: UpdateArticleDto) {
    const existing = this.db.queryOne<any>(`SELECT * FROM help_articles WHERE id = ?`, [id]);
    if (!existing) throw new NotFoundException(`Article not found`);

    const updatedCategory = dto.categoryId ?? existing.category_id;
    const updatedTitle = dto.title ?? existing.title;
    const updatedSlug = dto.slug ?? existing.slug;
    const updatedSummary = dto.summary ?? existing.summary;
    const updatedContent = dto.content ?? existing.content;
    const updatedAudience = dto.audience ?? existing.audience;
    const updatedKeywords = dto.searchKeywords ?? existing.search_keywords;
    const updatedPopular = dto.isPopular !== undefined ? (dto.isPopular ? 1 : 0) : existing.is_popular;
    const updatedStatus = dto.status ?? existing.status;
    const updatedOrder = dto.displayOrder ?? existing.display_order;
    const now = new Date().toISOString();

    this.db.execute(
      `UPDATE help_articles
       SET category_id = ?, title = ?, slug = ?, summary = ?, content = ?, audience = ?, search_keywords = ?, is_popular = ?, status = ?, display_order = ?, updated_at = ?
       WHERE id = ?`,
      [updatedCategory, updatedTitle, updatedSlug, updatedSummary, updatedContent, updatedAudience, updatedKeywords, updatedPopular, updatedStatus, updatedOrder, now, id]
    );

    return { id, success: true };
  }

  adminDeleteArticle(id: string) {
    this.db.execute(`DELETE FROM help_articles WHERE id = ?`, [id]);
    return { success: true };
  }

  adminGetAllChannels() {
    return this.db.query<any>(`SELECT * FROM support_channels ORDER BY audience ASC, display_order ASC`);
  }

  adminUpdateChannel(id: string, body: { label?: string; value?: string; is_active?: boolean; display_order?: number }) {
    const existing = this.db.queryOne<any>(`SELECT * FROM support_channels WHERE id = ?`, [id]);
    if (!existing) throw new NotFoundException(`Channel not found`);

    const label = body.label ?? existing.label;
    const val = body.value ?? existing.value;
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;
    const order = body.display_order ?? existing.display_order;
    const now = new Date().toISOString();

    this.db.execute(
      `UPDATE support_channels SET label = ?, value = ?, is_active = ?, display_order = ?, updated_at = ? WHERE id = ?`,
      [label, val, isActive, order, now, id]
    );

    return { success: true };
  }

  adminGetAllTickets() {
    return this.db.query<any>(
      `SELECT t.*, u.full_name as userName, u.phone_number as userPhone, u.email as userEmail
       FROM support_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC`
    );
  }

  adminUpdateTicketStatus(id: string, status: string, adminNotes?: string) {
    const now = new Date().toISOString();
    this.db.execute(
      `UPDATE support_tickets SET status = ?, admin_notes = ?, updated_at = ? WHERE id = ?`,
      [status, adminNotes || null, now, id]
    );
    return { success: true };
  }
}

