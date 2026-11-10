import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  iconName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
  servicesCount?: number;
  businessesCount?: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DatabaseService) {}

  getAllCategories(): CategoryDto[] {
    const rows = this.db.query<any>(`
      SELECT 
        c.id, c.name, c.slug, c.icon_name as iconName, 
        c.meta_title as metaTitle, c.meta_description as metaDescription,
        c.sort_order as sortOrder,
        (SELECT COUNT(*) FROM services s WHERE s.category_id = c.id) as servicesCount,
        (SELECT COUNT(DISTINCT bc.business_id) FROM business_categories bc WHERE bc.category_id = c.id) as businessesCount
      FROM categories c
      WHERE c.is_active = 1
      ORDER BY c.sort_order ASC
    `);
    return rows;
  }

  getPopularCategories(limit = 8): CategoryDto[] {
    const rows = this.db.query<any>(`
      SELECT 
        c.id, c.name, c.slug, c.icon_name as iconName, 
        c.meta_title as metaTitle, c.meta_description as metaDescription,
        c.sort_order as sortOrder,
        (SELECT COUNT(*) FROM services s WHERE s.category_id = c.id) as servicesCount,
        (SELECT COUNT(DISTINCT bc.business_id) FROM business_categories bc WHERE bc.category_id = c.id) as businessesCount
      FROM categories c
      WHERE c.is_active = 1
      ORDER BY c.sort_order ASC
      LIMIT ?
    `, [limit]);
    return rows;
  }

  getCategoryBySlug(slug: string) {
    const category = this.db.queryOne<any>(`
      SELECT 
        id, name, slug, icon_name as iconName, 
        meta_title as metaTitle, meta_description as metaDescription,
        sort_order as sortOrder
      FROM categories
      WHERE slug = ? AND is_active = 1
    `, [slug]);

    if (!category) {
      throw new NotFoundException(`Category '${slug}' not found`);
    }

    const services = this.db.query<any>(`
      SELECT id, name, slug
      FROM services
      WHERE category_id = ?
      ORDER BY name ASC
    `, [category.id]);

    return {
      ...category,
      services,
    };
  }

  // --- Public Master Data for Business Types & Document Types ---
  getBusinessTypes(includeInactive = false) {
    let sql = `
      SELECT id, code, name, description, sort_order as sortOrder, is_active as isActive
      FROM business_types
    `;
    if (!includeInactive) {
      sql += ` WHERE is_active = 1`;
    }
    sql += ` ORDER BY sort_order ASC`;
    return this.db.query<any>(sql);
  }

  createBusinessType(dto: { name: string; code?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    const id = `btype-${Date.now()}`;
    const code = (dto.code || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")).slice(0, 50);
    const now = new Date().toISOString();
    const isActive = dto.isActive !== false ? 1 : 0;
    const sortOrder = typeof dto.sortOrder === "number" ? dto.sortOrder : 0;

    this.db.execute(`
      INSERT INTO business_types (id, code, name, description, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, code, dto.name, dto.description || "", sortOrder, isActive, now, now]);

    return { id, code, name: dto.name, description: dto.description || "", sortOrder, isActive };
  }

  updateBusinessType(id: string, dto: { name?: string; code?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    const existing = this.db.queryOne<any>("SELECT * FROM business_types WHERE id = ?", [id]);
    if (!existing) {
      throw new NotFoundException(`Business type '${id}' not found`);
    }

    const name = dto.name !== undefined ? dto.name : existing.name;
    const code = dto.code !== undefined ? dto.code : existing.code;
    const description = dto.description !== undefined ? dto.description : existing.description;
    const sortOrder = dto.sortOrder !== undefined ? dto.sortOrder : existing.sort_order;
    const isActive = dto.isActive !== undefined ? (dto.isActive ? 1 : 0) : existing.is_active;
    const now = new Date().toISOString();

    this.db.execute(`
      UPDATE business_types
      SET name = ?, code = ?, description = ?, sort_order = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `, [name, code, description, sortOrder, isActive, now, id]);

    return { id, code, name, description, sortOrder, isActive };
  }

  deleteBusinessType(id: string) {
    const existing = this.db.queryOne<any>("SELECT * FROM business_types WHERE id = ?", [id]);
    if (!existing) {
      throw new NotFoundException(`Business type '${id}' not found`);
    }
    this.db.execute("DELETE FROM business_types WHERE id = ?", [id]);
    return { success: true, id };
  }

  getDocumentTypes(includeInactive = false) {
    let sql = `
      SELECT id, code, name, description, category, sort_order as sortOrder, is_active as isActive
      FROM document_types
    `;
    if (!includeInactive) {
      sql += ` WHERE is_active = 1`;
    }
    sql += ` ORDER BY sort_order ASC`;
    return this.db.query<any>(sql);
  }

  createDocumentType(dto: { name: string; code?: string; description?: string; category?: string; sortOrder?: number; isActive?: boolean }) {
    const id = `doctype-${Date.now()}`;
    const code = (dto.code || dto.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")).slice(0, 50);
    const now = new Date().toISOString();
    const isActive = dto.isActive !== false ? 1 : 0;
    const sortOrder = typeof dto.sortOrder === "number" ? dto.sortOrder : 0;
    const category = dto.category || "BUSINESS_PROOF";

    this.db.execute(`
      INSERT INTO document_types (id, code, name, description, category, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, code, dto.name, dto.description || "", category, sortOrder, isActive, now, now]);

    return { id, code, name: dto.name, description: dto.description || "", category, sortOrder, isActive };
  }

  updateDocumentType(id: string, dto: { name?: string; code?: string; description?: string; category?: string; sortOrder?: number; isActive?: boolean }) {
    const existing = this.db.queryOne<any>("SELECT * FROM document_types WHERE id = ?", [id]);
    if (!existing) {
      throw new NotFoundException(`Document type '${id}' not found`);
    }

    const name = dto.name !== undefined ? dto.name : existing.name;
    const code = dto.code !== undefined ? dto.code : existing.code;
    const description = dto.description !== undefined ? dto.description : existing.description;
    const category = dto.category !== undefined ? dto.category : existing.category;
    const sortOrder = dto.sortOrder !== undefined ? dto.sortOrder : existing.sort_order;
    const isActive = dto.isActive !== undefined ? (dto.isActive ? 1 : 0) : existing.is_active;
    const now = new Date().toISOString();

    this.db.execute(`
      UPDATE document_types
      SET name = ?, code = ?, description = ?, category = ?, sort_order = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `, [name, code, description, category, sortOrder, isActive, now, id]);

    return { id, code, name, description, category, sortOrder, isActive };
  }

  deleteDocumentType(id: string) {
    const existing = this.db.queryOne<any>("SELECT * FROM document_types WHERE id = ?", [id]);
    if (!existing) {
      throw new NotFoundException(`Document type '${id}' not found`);
    }
    this.db.execute("DELETE FROM document_types WHERE id = ?", [id]);
    return { success: true, id };
  }

  // --- Category Management (Admin CRUD) ---
  getAllCategoriesAdmin() {
    return this.db.query<any>(`
      SELECT 
        c.id, c.name, c.slug, c.icon_name as iconName, 
        c.meta_title as metaTitle, c.meta_description as metaDescription,
        c.sort_order as sortOrder, c.is_active as isActive,
        (SELECT COUNT(*) FROM services s WHERE s.category_id = c.id) as servicesCount,
        (SELECT COUNT(DISTINCT bc.business_id) FROM business_categories bc WHERE bc.category_id = c.id) as businessesCount
      FROM categories c
      ORDER BY c.sort_order ASC
    `);
  }

  createCategory(dto: { name: string; slug?: string; iconName?: string; metaTitle?: string; metaDescription?: string; sortOrder?: number; isActive?: boolean }) {
    const id = `cat-${Date.now()}`;
    const slug = (dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")).slice(0, 100);
    const sortOrder = typeof dto.sortOrder === "number" ? dto.sortOrder : 0;
    const isActive = dto.isActive !== false ? 1 : 0;

    this.db.execute(`
      INSERT INTO categories (id, name, slug, icon_name, meta_title, meta_description, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      dto.name,
      slug,
      dto.iconName || "Layers",
      dto.metaTitle || `${dto.name} in Andhra Pradesh`,
      dto.metaDescription || `Browse verified ${dto.name} services and businesses`,
      sortOrder,
      isActive
    ]);

    return { id, name: dto.name, slug, iconName: dto.iconName, sortOrder, isActive };
  }

  updateCategory(id: string, dto: { name?: string; slug?: string; iconName?: string; metaTitle?: string; metaDescription?: string; sortOrder?: number; isActive?: boolean }) {
    const existing = this.db.queryOne<any>("SELECT * FROM categories WHERE id = ?", [id]);
    if (!existing) {
      throw new NotFoundException(`Category '${id}' not found`);
    }

    const name = dto.name !== undefined ? dto.name : existing.name;
    const slug = dto.slug !== undefined ? dto.slug : existing.slug;
    const iconName = dto.iconName !== undefined ? dto.iconName : existing.icon_name;
    const metaTitle = dto.metaTitle !== undefined ? dto.metaTitle : existing.meta_title;
    const metaDescription = dto.metaDescription !== undefined ? dto.metaDescription : existing.meta_description;
    const sortOrder = dto.sortOrder !== undefined ? dto.sortOrder : existing.sort_order;
    const isActive = dto.isActive !== undefined ? (dto.isActive ? 1 : 0) : existing.is_active;

    this.db.execute(`
      UPDATE categories
      SET name = ?, slug = ?, icon_name = ?, meta_title = ?, meta_description = ?, sort_order = ?, is_active = ?
      WHERE id = ?
    `, [name, slug, iconName, metaTitle, metaDescription, sortOrder, isActive, id]);

    return { id, name, slug, iconName, metaTitle, metaDescription, sortOrder, isActive };
  }

  deleteCategory(id: string) {
    const existing = this.db.queryOne<any>("SELECT * FROM categories WHERE id = ?", [id]);
    if (!existing) {
      throw new NotFoundException(`Category '${id}' not found`);
    }
    this.db.execute("DELETE FROM categories WHERE id = ?", [id]);
    return { success: true, id };
  }

  // --- Subcategories (Services) Admin CRUD ---
  getSubcategories(categoryId?: string) {
    let sql = `
      SELECT 
        s.id, s.category_id as categoryId, s.name, s.slug, s.description,
        s.sort_order as sortOrder, s.is_active as isActive,
        c.name as categoryName, c.slug as categorySlug
      FROM services s
      JOIN categories c ON s.category_id = c.id
    `;
    const params: any[] = [];
    if (categoryId && categoryId !== "ALL") {
      sql += ` WHERE s.category_id = ? OR c.slug = ?`;
      params.push(categoryId, categoryId);
    }
    sql += ` ORDER BY c.sort_order ASC, s.sort_order ASC, s.name ASC`;
    return this.db.query<any>(sql, params);
  }

  createSubcategory(dto: { categoryId: string; name: string; slug?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    const id = `subcat-${Date.now()}`;
    const slug = (dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")).slice(0, 100);
    const sortOrder = typeof dto.sortOrder === "number" ? dto.sortOrder : 0;
    const isActive = dto.isActive !== false ? 1 : 0;

    const cat = this.db.queryOne<any>("SELECT id FROM categories WHERE id = ? OR slug = ?", [dto.categoryId, dto.categoryId]);
    if (!cat) {
      throw new NotFoundException(`Category '${dto.categoryId}' not found`);
    }

    this.db.execute(`
      INSERT INTO services (id, category_id, name, slug, description, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, cat.id, dto.name, slug, dto.description || "", sortOrder, isActive]);

    return { id, categoryId: cat.id, name: dto.name, slug, description: dto.description || "", sortOrder, isActive };
  }

  updateSubcategory(id: string, dto: { categoryId?: string; name?: string; slug?: string; description?: string; sortOrder?: number; isActive?: boolean }) {
    const existing = this.db.queryOne<any>("SELECT * FROM services WHERE id = ?", [id]);
    if (!existing) {
      throw new NotFoundException(`Subcategory '${id}' not found`);
    }

    let categoryId = existing.category_id;
    if (dto.categoryId) {
      const cat = this.db.queryOne<any>("SELECT id FROM categories WHERE id = ? OR slug = ?", [dto.categoryId, dto.categoryId]);
      if (cat) categoryId = cat.id;
    }

    const name = dto.name !== undefined ? dto.name : existing.name;
    const slug = dto.slug !== undefined ? dto.slug : existing.slug;
    const description = dto.description !== undefined ? dto.description : existing.description;
    const sortOrder = dto.sortOrder !== undefined ? dto.sortOrder : existing.sort_order;
    const isActive = dto.isActive !== undefined ? (dto.isActive ? 1 : 0) : existing.is_active;

    this.db.execute(`
      UPDATE services
      SET category_id = ?, name = ?, slug = ?, description = ?, sort_order = ?, is_active = ?
      WHERE id = ?
    `, [categoryId, name, slug, description, sortOrder, isActive, id]);

    return { id, categoryId, name, slug, description, sortOrder, isActive };
  }

  deleteSubcategory(id: string) {
    const existing = this.db.queryOne<any>("SELECT * FROM services WHERE id = ?", [id]);
    if (!existing) {
      throw new NotFoundException(`Subcategory '${id}' not found`);
    }
    this.db.execute("DELETE FROM services WHERE id = ?", [id]);
    return { success: true, id };
  }

  // --- Public Active Coupons API for Customer & Website Consumption ---
  getActiveCoupons(city?: string, category?: string) {
    let sql = `
      SELECT 
        id, code, title, description, terms, banner_url, category,
        discount_type, discount_value, min_order_value, max_discount,
        applicable_city, applicable_category, valid_until, status
      FROM coupons 
      WHERE status = 'ACTIVE'
    `;
    const params: any[] = [];

    if (city && city.toLowerCase() !== "all") {
      sql += ` AND (applicable_city = 'All' OR LOWER(applicable_city) = LOWER(?))`;
      params.push(city);
    }

    if (category && category.toLowerCase() !== "all") {
      sql += ` AND (applicable_category = 'All' OR LOWER(applicable_category) = LOWER(?))`;
      params.push(category);
    }

    sql += ` ORDER BY created_at DESC`;
    return this.db.query<any>(sql, params);
  }
}
