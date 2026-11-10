import { Controller, Get, Post, Put, Delete, Body, Param, Query } from "@nestjs/common";
import { CategoriesService } from "./categories.service";

@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get("categories")
  getAllCategories() {
    const data = this.categoriesService.getAllCategories();
    return {
      success: true,
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get("subcategories")
  getSubcategories(@Query("categoryId") categoryId?: string) {
    const data = this.categoriesService.getSubcategories(categoryId);
    return {
      success: true,
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get("categories/popular")
  getPopularCategories(@Query("limit") limitStr?: string) {
    const limit = limitStr ? parseInt(limitStr, 10) : 8;
    const data = this.categoriesService.getPopularCategories(limit);
    return {
      success: true,
      data,
    };
  }

  @Get("categories/:slug")
  getCategoryBySlug(@Param("slug") slug: string) {
    const data = this.categoriesService.getCategoryBySlug(slug);
    return {
      success: true,
      data,
    };
  }

  // --- Public Master Data for Business Types & Document Registration Proofs ---
  @Get("meta/business-types")
  getBusinessTypes() {
    const data = this.categoriesService.getBusinessTypes(false);
    return {
      success: true,
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get("meta/document-types")
  getDocumentTypes() {
    const data = this.categoriesService.getDocumentTypes(false);
    return {
      success: true,
      data,
      meta: {
        total: data.length,
      },
    };
  }

  // =========================================================================
  // ADMIN MASTER DATA MANAGEMENT APIS (CRUD)
  // =========================================================================

  // Categories CRUD
  @Get("admin/categories")
  getAdminCategories() {
    const data = this.categoriesService.getAllCategoriesAdmin();
    return { success: true, data };
  }

  @Post("admin/categories")
  createCategory(@Body() body: any) {
    const data = this.categoriesService.createCategory(body);
    return { success: true, message: "Category created successfully", data };
  }

  @Put("admin/categories/:id")
  updateCategory(@Param("id") id: string, @Body() body: any) {
    const data = this.categoriesService.updateCategory(id, body);
    return { success: true, message: "Category updated successfully", data };
  }

  @Delete("admin/categories/:id")
  deleteCategory(@Param("id") id: string) {
    const data = this.categoriesService.deleteCategory(id);
    return { success: true, message: "Category deleted successfully", data };
  }

  // Subcategories CRUD
  @Get("admin/subcategories")
  getAdminSubcategories(@Query("categoryId") categoryId?: string) {
    const data = this.categoriesService.getSubcategories(categoryId);
    return { success: true, data };
  }

  @Post("admin/subcategories")
  createSubcategory(@Body() body: any) {
    const data = this.categoriesService.createSubcategory(body);
    return { success: true, message: "Subcategory created successfully", data };
  }

  @Put("admin/subcategories/:id")
  updateSubcategory(@Param("id") id: string, @Body() body: any) {
    const data = this.categoriesService.updateSubcategory(id, body);
    return { success: true, message: "Subcategory updated successfully", data };
  }

  @Delete("admin/subcategories/:id")
  deleteSubcategory(@Param("id") id: string) {
    const data = this.categoriesService.deleteSubcategory(id);
    return { success: true, message: "Subcategory deleted successfully", data };
  }

  // Business Types CRUD
  @Get("admin/business-types")
  getAdminBusinessTypes() {
    const data = this.categoriesService.getBusinessTypes(true);
    return { success: true, data };
  }

  @Post("admin/business-types")
  createBusinessType(@Body() body: any) {
    const data = this.categoriesService.createBusinessType(body);
    return { success: true, message: "Business type created successfully", data };
  }

  @Put("admin/business-types/:id")
  updateBusinessType(@Param("id") id: string, @Body() body: any) {
    const data = this.categoriesService.updateBusinessType(id, body);
    return { success: true, message: "Business type updated successfully", data };
  }

  @Delete("admin/business-types/:id")
  deleteBusinessType(@Param("id") id: string) {
    const data = this.categoriesService.deleteBusinessType(id);
    return { success: true, message: "Business type deleted successfully", data };
  }

  // Document Types CRUD
  @Get("admin/document-types")
  getAdminDocumentTypes() {
    const data = this.categoriesService.getDocumentTypes(true);
    return { success: true, data };
  }

  @Post("admin/document-types")
  createDocumentType(@Body() body: any) {
    const data = this.categoriesService.createDocumentType(body);
    return { success: true, message: "Document type created successfully", data };
  }

  @Put("admin/document-types/:id")
  updateDocumentType(@Param("id") id: string, @Body() body: any) {
    const data = this.categoriesService.updateDocumentType(id, body);
    return { success: true, message: "Document type updated successfully", data };
  }

  @Delete("admin/document-types/:id")
  deleteDocumentType(@Param("id") id: string) {
    const data = this.categoriesService.deleteDocumentType(id);
    return { success: true, message: "Document type deleted successfully", data };
  }

  // --- Public Active Coupons for Customers and Website ---
  @Get("coupons")
  getActiveCoupons(
    @Query("city") city?: string,
    @Query("category") category?: string
  ) {
    const data = this.categoriesService.getActiveCoupons(city, category);
    return {
      success: true,
      data,
      meta: {
        total: data.length,
      },
    };
  }
}
