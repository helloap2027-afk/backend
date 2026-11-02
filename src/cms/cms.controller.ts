import { Controller, Get, Put, Post, Param, Body, Query, Headers, HttpCode } from "@nestjs/common";
import { CmsService, UpdatePageDto } from "./cms.service";

@Controller()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ================= ADMIN CMS ENDPOINTS ================= //

  @Get("admin/cms/pages")
  getAllPages(@Query("lang") lang?: string) {
    return {
      success: true,
      data: this.cmsService.getAllPages(lang || "en"),
    };
  }

  @Get("admin/cms/pages/:slug")
  getPageBySlug(@Param("slug") slug: string, @Query("lang") lang?: string) {
    return {
      success: true,
      data: this.cmsService.getPageBySlug(slug, lang || "en"),
    };
  }

  @Put("admin/cms/pages/:slug")
  updatePage(
    @Param("slug") slug: string,
    @Body() dto: UpdatePageDto,
    @Headers("x-admin-user") adminUser?: string,
    @Headers("x-admin-role") adminRole?: string,
    @Query("lang") lang?: string
  ) {
    const user = {
      name: adminUser || "Super Admin",
      role: adminRole || "SUPER_ADMIN",
    };
    return {
      success: true,
      data: this.cmsService.updatePage(slug, dto, user, lang || "en"),
    };
  }

  @Post("admin/cms/pages/:slug/publish")
  @HttpCode(200)
  publishPage(
    @Param("slug") slug: string,
    @Headers("x-admin-user") adminUser?: string,
    @Headers("x-admin-role") adminRole?: string,
    @Query("lang") lang?: string
  ) {
    const user = {
      name: adminUser || "Super Admin",
      role: adminRole || "SUPER_ADMIN",
    };
    return {
      success: true,
      data: this.cmsService.publishPage(slug, user, lang || "en"),
    };
  }

  @Post("admin/cms/pages/:slug/status")
  @HttpCode(200)
  updateStatus(
    @Param("slug") slug: string,
    @Body("status") status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED",
    @Headers("x-admin-user") adminUser?: string,
    @Headers("x-admin-role") adminRole?: string,
    @Query("lang") lang?: string
  ) {
    const user = {
      name: adminUser || "Super Admin",
      role: adminRole || "SUPER_ADMIN",
    };
    return {
      success: true,
      data: this.cmsService.updateStatus(slug, status, user, lang || "en"),
    };
  }

  @Post("admin/cms/pages/:slug/visibility")
  @HttpCode(200)
  updateVisibility(
    @Param("slug") slug: string,
    @Body("visibility") visibility: "PUBLIC" | "PRIVATE" | "UNLISTED",
    @Headers("x-admin-user") adminUser?: string,
    @Headers("x-admin-role") adminRole?: string,
    @Query("lang") lang?: string
  ) {
    const user = {
      name: adminUser || "Super Admin",
      role: adminRole || "SUPER_ADMIN",
    };
    return {
      success: true,
      data: this.cmsService.updateVisibility(slug, visibility, user, lang || "en"),
    };
  }

  @Get("admin/cms/pages/:slug/revisions")
  getRevisions(@Param("slug") slug: string, @Query("lang") lang?: string) {
    return {
      success: true,
      data: this.cmsService.getRevisions(slug, lang || "en"),
    };
  }

  @Post("admin/cms/pages/:slug/revisions/:revisionId/restore")
  @HttpCode(200)
  restoreRevision(
    @Param("slug") slug: string,
    @Param("revisionId") revisionId: string,
    @Headers("x-admin-user") adminUser?: string,
    @Headers("x-admin-role") adminRole?: string,
    @Query("lang") lang?: string
  ) {
    const user = {
      name: adminUser || "Super Admin",
      role: adminRole || "SUPER_ADMIN",
    };
    return {
      success: true,
      data: this.cmsService.restoreRevision(slug, revisionId, user, lang || "en"),
    };
  }

  @Get("admin/cms/pages/:slug/audit-logs")
  getAuditLogs(@Param("slug") slug: string, @Query("lang") lang?: string) {
    return {
      success: true,
      data: this.cmsService.getAuditLogs(slug, lang || "en"),
    };
  }

  // ================= PUBLIC READ-ONLY CONTENT ENDPOINT ================= //

  @Get("cms/public/:slug")
  getPublicPage(@Param("slug") slug: string, @Query("lang") lang?: string) {
    return {
      success: true,
      data: this.cmsService.getPublicPage(slug, lang || "en"),
    };
  }
}
