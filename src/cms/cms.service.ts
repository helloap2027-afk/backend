import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface UpdatePageDto {
  title?: string;
  shortDescription?: string;
  content?: string;
  faqItems?: any[];
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  status?: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  robotsIndex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  changeSummary?: string;
}

@Injectable()
export class CmsService {
  constructor(private readonly db: DatabaseService) {}

  getAllPages(lang: string = "en") {
    const pages = this.db.query<any>(
      `SELECT slug, language, title, short_description, status, visibility, updated_at, updated_by
       FROM cms_pages
       WHERE language = ?
       ORDER BY title ASC`,
      [lang]
    );

    return pages.map((p) => ({
      slug: p.slug,
      language: p.language,
      title: p.title,
      shortDescription: p.short_description,
      status: p.status,
      visibility: p.visibility,
      updatedAt: p.updated_at,
      updatedBy: p.updated_by,
    }));
  }

  public resolveCanonicalSlug(slug: string): string {
    const s = (slug || "").toLowerCase().trim();
    const aliasMap: Record<string, string> = {
      contact: "contact-support",
      "contact-us": "contact-support",
      support: "contact-support",
      terms: "terms-and-conditions",
      "terms-and-conditions": "terms-and-conditions",
      "terms-conditions": "terms-and-conditions",
      faq: "faqs",
      faqs: "faqs",
      about: "about-us",
      "about-us": "about-us",
      privacy: "privacy-policy",
      "privacy-policy": "privacy-policy",
      refund: "refund-cancellation-policy",
      "refund-cancellation-policy": "refund-cancellation-policy",
      cookie: "cookie-policy",
      "cookie-policy": "cookie-policy",
      community: "community-guidelines",
      "community-guidelines": "community-guidelines",
    };
    return aliasMap[s] || s;
  }

  getPageBySlug(slug: string, lang: string = "en") {
    const targetSlug = this.resolveCanonicalSlug(slug);
    let page = this.db.queryOne<any>(
      `SELECT * FROM cms_pages WHERE slug = ? AND language = ?`,
      [targetSlug, lang]
    );

    // If requested language translation not found, attempt fallback to English
    let isFallback = false;
    if (!page && lang !== "en") {
      page = this.db.queryOne<any>(
        `SELECT * FROM cms_pages WHERE slug = ? AND language = 'en'`,
        [targetSlug]
      );
      if (page) isFallback = true;
    }

    if (!page) {
      throw new NotFoundException(`CMS page '${slug}' not found`);
    }

    let faqItems = [];
    try {
      if (page.faq_items_json) {
        faqItems = JSON.parse(page.faq_items_json);
      }
    } catch {
      faqItems = [];
    }

    return {
      id: page.id,
      slug: page.slug,
      language: isFallback ? lang : page.language,
      isTranslationFallback: isFallback,
      title: page.title,
      shortDescription: page.short_description || "",
      content: page.content || "",
      faqItems,
      status: page.status,
      visibility: page.visibility,
      publishedRevisionId: page.published_revision_id,
      seo: {
        metaTitle: page.meta_title || page.title,
        metaDescription: page.meta_description || page.short_description || "",
        canonicalUrl: page.canonical_url || `https://www.hello-hi.com/${page.slug}`,
        robotsIndex: page.robots_index === 1,
        ogTitle: page.og_title || page.title,
        ogDescription: page.og_description || page.short_description || "",
        ogImage: page.og_image || "",
      },
      createdBy: page.created_by,
      updatedBy: page.updated_by,
      createdAt: page.created_at,
      updatedAt: page.updated_at,
    };
  }

  updatePage(slug: string, dto: UpdatePageDto, user: { name: string; role: string }, lang: string = "en") {
    let page = this.db.queryOne<any>(
      `SELECT * FROM cms_pages WHERE slug = ? AND language = ?`,
      [slug, lang]
    );

    const now = new Date().toISOString();
    const userName = user?.name || "Super Admin";
    const userRole = user?.role || "SUPER_ADMIN";

    // If page doesn't exist for this language, create it
    if (!page) {
      const pageId = `page-${slug}-${lang}-${Date.now()}`;
      const faqJson = dto.faqItems ? JSON.stringify(dto.faqItems) : null;
      this.db.execute(
        `INSERT INTO cms_pages (
          id, slug, language, title, short_description, content, faq_items_json,
          status, visibility, meta_title, meta_description, canonical_url,
          robots_index, og_title, og_description, og_image,
          created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pageId,
          slug,
          lang,
          dto.title || slug,
          dto.shortDescription || "",
          dto.content || "",
          faqJson,
          dto.status || "DRAFT",
          dto.visibility || "PUBLIC",
          dto.metaTitle || dto.title || slug,
          dto.metaDescription || dto.shortDescription || "",
          dto.canonicalUrl || `https://www.hello-hi.com/${slug}`,
          dto.robotsIndex === false ? 0 : 1,
          dto.ogTitle || dto.title || slug,
          dto.ogDescription || dto.shortDescription || "",
          dto.ogImage || null,
          userName,
          userName,
          now,
          now,
        ]
      );

      // Create Revision 1
      const revId = `rev-${slug}-${lang}-1`;
      this.db.execute(
        `INSERT INTO cms_revisions (
          id, page_id, page_slug, language, revision_number, title, short_description,
          content, faq_items_json, seo_json, status, change_summary,
          created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          revId,
          pageId,
          slug,
          lang,
          1,
          dto.title || slug,
          dto.shortDescription || "",
          dto.content || "",
          faqJson,
          JSON.stringify({
            metaTitle: dto.metaTitle || dto.title,
            metaDescription: dto.metaDescription || dto.shortDescription,
            canonicalUrl: dto.canonicalUrl,
            robotsIndex: dto.robotsIndex !== false,
          }),
          dto.status || "DRAFT",
          dto.changeSummary || "Initial language translation draft created",
          userName,
          now,
        ]
      );

      // Log Audit
      this.logAudit(slug, lang, "CREATE", undefined, dto.status || "DRAFT", userName, userRole, `Created translation draft for ${lang}`);
      return this.getPageBySlug(slug, lang);
    }

    // Update existing page
    const previousStatus = page.status;
    const title = dto.title !== undefined ? dto.title : page.title;
    const shortDesc = dto.shortDescription !== undefined ? dto.shortDescription : page.short_description;
    const content = dto.content !== undefined ? dto.content : page.content;
    const faqJson = dto.faqItems !== undefined ? JSON.stringify(dto.faqItems) : page.faq_items_json;
    const visibility = dto.visibility !== undefined ? dto.visibility : page.visibility;
    const metaTitle = dto.metaTitle !== undefined ? dto.metaTitle : page.meta_title;
    const metaDesc = dto.metaDescription !== undefined ? dto.metaDescription : page.meta_description;
    const canonical = dto.canonicalUrl !== undefined ? dto.canonicalUrl : page.canonical_url;
    const robots = dto.robotsIndex !== undefined ? (dto.robotsIndex ? 1 : 0) : page.robots_index;
    const ogTitle = dto.ogTitle !== undefined ? dto.ogTitle : page.og_title;
    const ogDesc = dto.ogDescription !== undefined ? dto.ogDescription : page.og_description;
    const ogImg = dto.ogImage !== undefined ? dto.ogImage : page.og_image;

    this.db.execute(
      `UPDATE cms_pages SET
        title = ?,
        short_description = ?,
        content = ?,
        faq_items_json = ?,
        visibility = ?,
        meta_title = ?,
        meta_description = ?,
        canonical_url = ?,
        robots_index = ?,
        og_title = ?,
        og_description = ?,
        og_image = ?,
        updated_by = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        title,
        shortDesc,
        content,
        faqJson,
        visibility,
        metaTitle,
        metaDesc,
        canonical,
        robots,
        ogTitle,
        ogDesc,
        ogImg,
        userName,
        now,
        page.id,
      ]
    );

    // Save as new Revision snapshot
    const maxRev = this.db.queryOne<{ maxRev: number }>(
      `SELECT MAX(revision_number) as maxRev FROM cms_revisions WHERE page_id = ?`,
      [page.id]
    );
    const newRevNumber = (maxRev?.maxRev || 0) + 1;
    const revId = `rev-${slug}-${lang}-${newRevNumber}`;

    this.db.execute(
      `INSERT INTO cms_revisions (
        id, page_id, page_slug, language, revision_number, title, short_description,
        content, faq_items_json, seo_json, status, change_summary,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        revId,
        page.id,
        slug,
        lang,
        newRevNumber,
        title,
        shortDesc,
        content,
        faqJson,
        JSON.stringify({
          metaTitle,
          metaDescription: metaDesc,
          canonicalUrl: canonical,
          robotsIndex: robots === 1,
        }),
        page.status,
        dto.changeSummary || `Updated draft revision #${newRevNumber}`,
        userName,
        now,
      ]
    );

    this.logAudit(
      slug,
      lang,
      "UPDATE_DRAFT",
      previousStatus,
      page.status,
      userName,
      userRole,
      `Saved revision #${newRevNumber}: ${dto.changeSummary || "Draft content updated"}`
    );

    return this.getPageBySlug(slug, lang);
  }

  publishPage(slug: string, user: { name: string; role: string }, lang: string = "en") {
    const page = this.db.queryOne<any>(
      `SELECT * FROM cms_pages WHERE slug = ? AND language = ?`,
      [slug, lang]
    );

    if (!page) {
      throw new NotFoundException(`Page '${slug}' not found`);
    }

    const userName = user?.name || "Super Admin";
    const userRole = user?.role || "SUPER_ADMIN";

    // Permission check: only SUPER_ADMIN or authorized roles can publish
    if (userRole === "CMS_VIEWER") {
      throw new ForbiddenException("CMS Viewers do not have publishing privileges");
    }

    const now = new Date().toISOString();

    // Create a new Published Revision snapshot
    const maxRev = this.db.queryOne<{ maxRev: number }>(
      `SELECT MAX(revision_number) as maxRev FROM cms_revisions WHERE page_id = ?`,
      [page.id]
    );
    const newRevNumber = (maxRev?.maxRev || 0) + 1;
    const revId = `rev-${slug}-${lang}-${newRevNumber}`;

    this.db.execute(
      `INSERT INTO cms_revisions (
        id, page_id, page_slug, language, revision_number, title, short_description,
        content, faq_items_json, seo_json, status, change_summary,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        revId,
        page.id,
        slug,
        lang,
        newRevNumber,
        page.title,
        page.short_description,
        page.content,
        page.faq_items_json,
        JSON.stringify({
          metaTitle: page.meta_title,
          metaDescription: page.meta_description,
          canonicalUrl: page.canonical_url,
          robotsIndex: page.robots_index === 1,
        }),
        "PUBLISHED",
        `Published revision #${newRevNumber} to live public channels`,
        userName,
        now,
      ]
    );

    // Update cms_pages table to mark as PUBLISHED and link published_revision_id
    this.db.execute(
      `UPDATE cms_pages SET
        status = 'PUBLISHED',
        published_revision_id = ?,
        updated_by = ?,
        updated_at = ?
       WHERE id = ?`,
      [revId, userName, now, page.id]
    );

    this.logAudit(
      slug,
      lang,
      "PUBLISH",
      page.status,
      "PUBLISHED",
      userName,
      userRole,
      `Published revision #${newRevNumber}`
    );

    return this.getPageBySlug(slug, lang);
  }

  updateStatus(slug: string, newStatus: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED", user: { name: string; role: string }, lang: string = "en") {
    const page = this.db.queryOne<any>(
      `SELECT * FROM cms_pages WHERE slug = ? AND language = ?`,
      [slug, lang]
    );

    if (!page) {
      throw new NotFoundException(`Page '${slug}' not found`);
    }

    const previousStatus = page.status;
    const userName = user?.name || "Super Admin";
    const userRole = user?.role || "SUPER_ADMIN";
    const now = new Date().toISOString();

    let action: any = "UPDATE_DRAFT";
    if (newStatus === "IN_REVIEW") action = "SUBMIT_REVIEW";
    else if (newStatus === "PUBLISHED") action = "PUBLISH";
    else if (newStatus === "ARCHIVED") action = "ARCHIVE";
    else if (previousStatus === "PUBLISHED" && newStatus === "DRAFT") action = "UNPUBLISH";

    this.db.execute(
      `UPDATE cms_pages SET
        status = ?,
        updated_by = ?,
        updated_at = ?
       WHERE id = ?`,
      [newStatus, userName, now, page.id]
    );

    this.logAudit(
      slug,
      lang,
      action,
      previousStatus,
      newStatus,
      userName,
      userRole,
      `Status changed from ${previousStatus} to ${newStatus}`
    );

    return this.getPageBySlug(slug, lang);
  }

  updateVisibility(slug: string, visibility: "PUBLIC" | "PRIVATE" | "UNLISTED", user: { name: string; role: string }, lang: string = "en") {
    const page = this.db.queryOne<any>(
      `SELECT * FROM cms_pages WHERE slug = ? AND language = ?`,
      [slug, lang]
    );

    if (!page) {
      throw new NotFoundException(`Page '${slug}' not found`);
    }

    const userName = user?.name || "Super Admin";
    const userRole = user?.role || "SUPER_ADMIN";
    const now = new Date().toISOString();

    this.db.execute(
      `UPDATE cms_pages SET
        visibility = ?,
        updated_by = ?,
        updated_at = ?
       WHERE id = ?`,
      [visibility, userName, now, page.id]
    );

    this.logAudit(
      slug,
      lang,
      "UPDATE_VISIBILITY",
      page.status,
      page.status,
      userName,
      userRole,
      `Visibility updated to ${visibility}`
    );

    return this.getPageBySlug(slug, lang);
  }

  getRevisions(slug: string, lang: string = "en") {
    const page = this.db.queryOne<any>(
      `SELECT id FROM cms_pages WHERE slug = ? AND language = ?`,
      [slug, lang]
    );

    if (!page) {
      return [];
    }

    const rows = this.db.query<any>(
      `SELECT id, revision_number, title, short_description, content, faq_items_json, seo_json, status, change_summary, created_by, created_at
       FROM cms_revisions
       WHERE page_id = ?
       ORDER BY revision_number DESC`,
      [page.id]
    );

    return rows.map((r) => {
      let faqItems = [];
      let seo = null;
      try {
        if (r.faq_items_json) faqItems = JSON.parse(r.faq_items_json);
        if (r.seo_json) seo = JSON.parse(r.seo_json);
      } catch {}

      return {
        id: r.id,
        revisionNumber: r.revision_number,
        title: r.title,
        shortDescription: r.short_description,
        content: r.content,
        faqItems,
        seo,
        status: r.status,
        changeSummary: r.change_summary || "Revision snapshot",
        createdBy: r.created_by,
        createdAt: r.created_at,
      };
    });
  }

  restoreRevision(slug: string, revisionId: string, user: { name: string; role: string }, lang: string = "en") {
    const page = this.db.queryOne<any>(
      `SELECT * FROM cms_pages WHERE slug = ? AND language = ?`,
      [slug, lang]
    );

    if (!page) {
      throw new NotFoundException(`Page '${slug}' not found`);
    }

    const targetRev = this.db.queryOne<any>(
      `SELECT * FROM cms_revisions WHERE id = ?`,
      [revisionId]
    );

    if (!targetRev) {
      throw new NotFoundException(`Revision '${revisionId}' not found`);
    }

    const userName = user?.name || "Super Admin";
    const userRole = user?.role || "SUPER_ADMIN";
    const now = new Date().toISOString();

    // Restores content to draft without destroying revision history
    this.db.execute(
      `UPDATE cms_pages SET
        title = ?,
        short_description = ?,
        content = ?,
        faq_items_json = ?,
        status = 'DRAFT',
        updated_by = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        targetRev.title,
        targetRev.short_description,
        targetRev.content,
        targetRev.faq_items_json,
        userName,
        now,
        page.id,
      ]
    );

    // Create a new revision representing the rollback to draft
    const maxRev = this.db.queryOne<{ maxRev: number }>(
      `SELECT MAX(revision_number) as maxRev FROM cms_revisions WHERE page_id = ?`,
      [page.id]
    );
    const newRevNumber = (maxRev?.maxRev || 0) + 1;
    const revId = `rev-${slug}-${lang}-${newRevNumber}`;

    this.db.execute(
      `INSERT INTO cms_revisions (
        id, page_id, page_slug, language, revision_number, title, short_description,
        content, faq_items_json, seo_json, status, change_summary,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        revId,
        page.id,
        slug,
        lang,
        newRevNumber,
        targetRev.title,
        targetRev.short_description,
        targetRev.content,
        targetRev.faq_items_json,
        targetRev.seo_json,
        "DRAFT",
        `Restored from revision #${targetRev.revision_number}`,
        userName,
        now,
      ]
    );

    this.logAudit(
      slug,
      lang,
      "RESTORE_REVISION",
      page.status,
      "DRAFT",
      userName,
      userRole,
      `Restored revision #${targetRev.revision_number} to active draft #${newRevNumber}`
    );

    return this.getPageBySlug(slug, lang);
  }

  getAuditLogs(slug: string, lang: string = "en") {
    const logs = this.db.query<any>(
      `SELECT id, page_slug, language, action, previous_status, new_status, performed_by, performed_by_role, details, timestamp
       FROM cms_audit_logs
       WHERE page_slug = ? AND language = ?
       ORDER BY timestamp DESC
       LIMIT 50`,
      [slug, lang]
    );

    return logs.map((l) => ({
      id: l.id,
      pageSlug: l.page_slug,
      language: l.language,
      action: l.action,
      previousStatus: l.previous_status,
      newStatus: l.new_status,
      performedBy: l.performed_by,
      performedByRole: l.performed_by_role,
      details: l.details,
      timestamp: l.timestamp,
    }));
  }

  // Read-only public content endpoint
  getPublicPage(slug: string, lang: string = "en") {
    const targetSlug = this.resolveCanonicalSlug(slug);
    let page = this.db.queryOne<any>(
      `SELECT * FROM cms_pages WHERE slug = ? AND language = ?`,
      [targetSlug, lang]
    );

    if (!page && lang !== "en") {
      page = this.db.queryOne<any>(
        `SELECT * FROM cms_pages WHERE slug = ? AND language = 'en'`,
        [targetSlug]
      );
    }

    if (!page) {
      throw new NotFoundException(`Public page '${slug}' not found`);
    }

    // Must be published and not private
    if (page.status !== "PUBLISHED") {
      throw new NotFoundException(`Page '${slug}' is currently unpublished`);
    }

    if (page.visibility === "PRIVATE") {
      throw new ForbiddenException(`Page '${slug}' is private`);
    }

    // Retrieve published revision content to ensure draft updates are never prematurely exposed
    let content = page.content;
    let faqItems = [];
    if (page.published_revision_id) {
      const pubRev = this.db.queryOne<any>(
        `SELECT * FROM cms_revisions WHERE id = ?`,
        [page.published_revision_id]
      );
      if (pubRev) {
        content = pubRev.content;
        if (pubRev.faq_items_json) {
          try {
            faqItems = JSON.parse(pubRev.faq_items_json);
          } catch {}
        }
      }
    } else if (page.faq_items_json) {
      try {
        faqItems = JSON.parse(page.faq_items_json);
      } catch {}
    }

    return {
      title: page.title,
      slug: page.slug,
      language: page.language,
      shortDescription: page.short_description,
      content,
      faqItems,
      visibility: page.visibility,
      seo: {
        metaTitle: page.meta_title || page.title,
        metaDescription: page.meta_description || page.short_description,
        canonicalUrl: page.canonical_url,
        robotsIndex: page.robots_index === 1,
        ogTitle: page.og_title || page.title,
        ogDescription: page.og_description || page.short_description,
        ogImage: page.og_image,
      },
      updatedAt: page.updated_at,
    };
  }

  private logAudit(
    pageSlug: string,
    language: string,
    action: string,
    previousStatus: string | undefined,
    newStatus: string | undefined,
    performedBy: string,
    performedByRole: string,
    details: string
  ) {
    const id = `audit-${pageSlug}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    this.db.execute(
      `INSERT INTO cms_audit_logs (
        id, page_slug, language, action, previous_status, new_status,
        performed_by, performed_by_role, details, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        pageSlug,
        language,
        action,
        previousStatus || null,
        newStatus || null,
        performedBy,
        performedByRole,
        details,
        now,
      ]
    );
  }

  submitContactMessage(data: { name: string; email: string; phone?: string; subject?: string; message: string }) {
    if (!data.name || !data.email || !data.message) {
      throw new BadRequestException("Name, email, and message are required.");
    }
    const id = `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    this.db.execute(`
      INSERT INTO contact_submissions (id, full_name, email, phone, subject, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'NEW', ?)
    `, [
      id,
      data.name.trim(),
      data.email.trim(),
      data.phone?.trim() || null,
      data.subject?.trim() || "General Enquiry",
      data.message.trim(),
      now
    ]);
    return {
      id,
      message: "Your message has been received by Hello-Hi Support. Our team will get back to you shortly.",
      createdAt: now
    };
  }
}
