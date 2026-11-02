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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let CategoriesService = class CategoriesService {
    constructor(db) {
        this.db = db;
    }
    getAllCategories() {
        const rows = this.db.query(`
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
    getPopularCategories(limit = 8) {
        const rows = this.db.query(`
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
    getCategoryBySlug(slug) {
        const category = this.db.queryOne(`
      SELECT 
        id, name, slug, icon_name as iconName, 
        meta_title as metaTitle, meta_description as metaDescription,
        sort_order as sortOrder
      FROM categories
      WHERE slug = ? AND is_active = 1
    `, [slug]);
        if (!category) {
            throw new common_1.NotFoundException(`Category '${slug}' not found`);
        }
        const services = this.db.query(`
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
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map