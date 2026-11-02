import { Controller, Get, Param, Query } from "@nestjs/common";
import { CategoriesService } from "./categories.service";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
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

  @Get("popular")
  getPopularCategories(@Query("limit") limitStr?: string) {
    const limit = limitStr ? parseInt(limitStr, 10) : 8;
    const data = this.categoriesService.getPopularCategories(limit);
    return {
      success: true,
      data,
    };
  }

  @Get(":slug")
  getCategoryBySlug(@Param("slug") slug: string) {
    const data = this.categoriesService.getCategoryBySlug(slug);
    return {
      success: true,
      data,
    };
  }
}

