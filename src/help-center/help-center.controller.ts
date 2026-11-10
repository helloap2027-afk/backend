import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, Headers, HttpCode } from "@nestjs/common";
import { 
  HelpCenterService, 
  CreateCategoryDto, 
  UpdateCategoryDto, 
  CreateArticleDto, 
  UpdateArticleDto, 
  CreateTicketDto 
} from "./help-center.service";

@Controller("help-center")
export class HelpCenterController {
  constructor(private readonly helpCenterService: HelpCenterService) {}

  // =========================================================================
  // PUBLIC & ROLE-FILTERED CONSUMER ENDPOINTS
  // =========================================================================

  @Get("overview")
  getOverview(
    @Query("audience") audience?: string,
    @Headers("x-user-id") userId?: string,
    @Headers("x-active-role") activeRole?: string
  ) {
    // If authenticated role is passed, honor verified active role
    const resolvedAudience = activeRole === "MERCHANT" ? "BUSINESS_PARTNER" : (activeRole === "CUSTOMER" ? "CUSTOMER" : (audience || "GUEST"));
    return {
      success: true,
      data: this.helpCenterService.getOverview(resolvedAudience),
    };
  }

  @Get("categories")
  getCategories(@Query("audience") audience?: string) {
    return {
      success: true,
      data: this.helpCenterService.getCategories(audience || "ALL"),
    };
  }

  @Get("articles")
  getArticles(
    @Query("audience") audience?: string,
    @Query("categoryId") categoryId?: string,
    @Query("popular") popular?: string
  ) {
    return {
      success: true,
      data: this.helpCenterService.getArticles(
        audience || "ALL",
        categoryId,
        popular === "true" || popular === "1"
      ),
    };
  }

  @Get("articles/:slug")
  getArticleBySlug(
    @Param("slug") slug: string,
    @Query("audience") audience?: string
  ) {
    return {
      success: true,
      data: this.helpCenterService.getArticleBySlug(slug, audience || "ALL"),
    };
  }

  @Post("articles/:slug/feedback")
  @HttpCode(200)
  submitFeedback(
    @Param("slug") slug: string,
    @Body("isHelpful") isHelpful: boolean
  ) {
    return {
      success: true,
      data: this.helpCenterService.submitArticleFeedback(slug, isHelpful),
    };
  }

  @Get("search")
  search(
    @Query("q") q: string,
    @Query("audience") audience?: string,
    @Query("limit") limit?: string
  ) {
    return {
      success: true,
      data: this.helpCenterService.search(
        q || "",
        audience || "ALL",
        limit ? parseInt(limit, 10) : 20
      ),
    };
  }

  @Get("support-channels")
  getSupportChannels(@Query("audience") audience?: string) {
    return {
      success: true,
      data: this.helpCenterService.getSupportChannels(audience || "ALL"),
    };
  }

  @Post("tickets")
  createTicket(
    @Body() dto: CreateTicketDto,
    @Headers("x-user-id") userId?: string,
    @Headers("x-active-role") activeRole?: string
  ) {
    const user = {
      id: userId || "usr_guest",
      role: activeRole || "CUSTOMER",
    };
    return {
      success: true,
      data: this.helpCenterService.createTicket(dto, user),
    };
  }

  @Get("tickets/me")
  getUserTickets(@Headers("x-user-id") userId?: string) {
    if (!userId) {
      return { success: true, data: [] };
    }
    return {
      success: true,
      data: this.helpCenterService.getUserTickets(userId),
    };
  }
}

@Controller("admin/help-center")
export class AdminHelpCenterController {
  constructor(private readonly helpCenterService: HelpCenterService) {}

  // ================= CATEGORIES ================= //

  @Get("categories")
  getAllCategories() {
    return {
      success: true,
      data: this.helpCenterService.adminGetAllCategories(),
    };
  }

  @Post("categories")
  createCategory(@Body() dto: CreateCategoryDto) {
    return {
      success: true,
      data: this.helpCenterService.adminCreateCategory(dto),
    };
  }

  @Put("categories/:id")
  updateCategory(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return {
      success: true,
      data: this.helpCenterService.adminUpdateCategory(id, dto),
    };
  }

  @Delete("categories/:id")
  deleteCategory(@Param("id") id: string) {
    return {
      success: true,
      data: this.helpCenterService.adminDeleteCategory(id),
    };
  }

  // ================= ARTICLES ================= //

  @Get("articles")
  getAllArticles(
    @Query("audience") audience?: string,
    @Query("categoryId") categoryId?: string
  ) {
    return {
      success: true,
      data: this.helpCenterService.adminGetAllArticles(audience, categoryId),
    };
  }

  @Post("articles")
  createArticle(@Body() dto: CreateArticleDto) {
    return {
      success: true,
      data: this.helpCenterService.adminCreateArticle(dto),
    };
  }

  @Put("articles/:id")
  updateArticle(@Param("id") id: string, @Body() dto: UpdateArticleDto) {
    return {
      success: true,
      data: this.helpCenterService.adminUpdateArticle(id, dto),
    };
  }

  @Delete("articles/:id")
  deleteArticle(@Param("id") id: string) {
    return {
      success: true,
      data: this.helpCenterService.adminDeleteArticle(id),
    };
  }

  // ================= SUPPORT CHANNELS ================= //

  @Get("support-channels")
  getAllChannels() {
    return {
      success: true,
      data: this.helpCenterService.adminGetAllChannels(),
    };
  }

  @Put("support-channels/:id")
  updateChannel(
    @Param("id") id: string,
    @Body() body: { label?: string; value?: string; is_active?: boolean; display_order?: number }
  ) {
    return {
      success: true,
      data: this.helpCenterService.adminUpdateChannel(id, body),
    };
  }

  // ================= TICKETS ================= //

  @Get("tickets")
  getAllTickets() {
    return {
      success: true,
      data: this.helpCenterService.adminGetAllTickets(),
    };
  }

  @Patch("tickets/:id/status")
  updateTicketStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @Body("adminNotes") adminNotes?: string
  ) {
    return {
      success: true,
      data: this.helpCenterService.adminUpdateTicketStatus(id, status, adminNotes),
    };
  }
}

