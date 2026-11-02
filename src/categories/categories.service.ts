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
}

