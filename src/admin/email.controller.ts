import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpCode,
} from "@nestjs/common";
import { EmailService } from "./email.service";

@Controller("admin/email")
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // 1. Overview
  @Get("overview")
  getOverview(@Query("startDate") startDate?: string, @Query("endDate") endDate?: string) {
    return {
      success: true,
      data: this.emailService.getOverview(startDate, endDate),
    };
  }

  // 2. Global Settings
  @Get("settings")
  getSettings() {
    return {
      success: true,
      data: this.emailService.getGlobalSettings(),
    };
  }

  @Put("settings")
  updateSettings(@Body() body: any) {
    return {
      success: true,
      message: "Global email settings updated successfully",
      data: this.emailService.updateGlobalSettings(body),
    };
  }

  @Post("settings/test-connection")
  @HttpCode(200)
  testConnection() {
    return this.emailService.testSmtpConnection();
  }

  // 3. Branding, Header & Footer
  @Get("branding")
  getBranding() {
    return {
      success: true,
      data: this.emailService.getBrandingLayout(),
    };
  }

  @Put("branding")
  updateBranding(@Body() body: any) {
    return {
      success: true,
      message: "Email branding and layout configuration saved",
      data: this.emailService.updateBrandingLayout(body),
    };
  }

  // App Badges
  @Put("footer/apps/:id")
  updateAppBadge(@Param("id") id: string, @Body() body: any) {
    return {
      success: true,
      message: "App download badge updated",
      data: this.emailService.updateAppBadge(id, body),
    };
  }

  // Social Icons
  @Put("footer/socials/:id")
  updateSocialIcon(@Param("id") id: string, @Body() body: any) {
    return {
      success: true,
      message: "Social icon updated",
      data: this.emailService.updateSocialIcon(id, body),
    };
  }

  @Post("footer/socials")
  createSocialIcon(@Body() body: any) {
    return {
      success: true,
      message: "Social platform added to email footer",
      data: this.emailService.createSocialIcon(body),
    };
  }

  @Delete("footer/socials/:id")
  deleteSocialIcon(@Param("id") id: string) {
    return this.emailService.deleteSocialIcon(id);
  }

  // 4. Templates
  @Get("templates")
  getTemplates(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("category") category?: string,
    @Query("status") status?: string
  ) {
    const res = this.emailService.getTemplates({ page, pageSize, search, category, status });
    return {
      success: true,
      data: res.data,
      pagination: res.pagination,
    };
  }

  @Post("templates")
  createTemplate(@Body() body: any, @Headers("x-admin-user") adminUser?: string) {
    return {
      success: true,
      message: "Email template created successfully",
      data: this.emailService.createTemplate(body, adminUser || "Super Admin"),
    };
  }

  @Put("templates/:id")
  updateTemplate(@Param("id") id: string, @Body() body: any) {
    return {
      success: true,
      message: "Email template updated successfully",
      data: this.emailService.updateTemplate(id, body),
    };
  }

  @Delete("templates/:id")
  deleteTemplate(@Param("id") id: string) {
    return this.emailService.deleteTemplate(id);
  }

  // 5. Automated Events
  @Get("events")
  getEvents() {
    return {
      success: true,
      data: this.emailService.getEventMappings(),
    };
  }

  @Put("events/:id")
  updateEvent(@Param("id") id: string, @Body() body: any) {
    return {
      success: true,
      message: "Automated email event mapping updated",
      data: this.emailService.updateEventMapping(id, body),
    };
  }

  // 6. Promotional Campaigns
  @Get("campaigns")
  getCampaigns(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string
  ) {
    const res = this.emailService.getCampaigns({ page, pageSize, search, status });
    return {
      success: true,
      data: res.data,
      pagination: res.pagination,
    };
  }

  @Post("campaigns")
  createCampaign(@Body() body: any, @Headers("x-admin-user") adminUser?: string) {
    return {
      success: true,
      message: "Email marketing campaign saved",
      data: this.emailService.createCampaign(body, adminUser || "Super Admin"),
    };
  }

  @Delete("campaigns/:id")
  deleteCampaign(@Param("id") id: string) {
    return this.emailService.deleteCampaign(id);
  }

  // 7. Delivery Logs
  @Get("logs")
  getLogs(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("category") category?: string
  ) {
    const res = this.emailService.getLogs({ page, pageSize, search, status, category });
    return {
      success: true,
      data: res.data,
      pagination: res.pagination,
    };
  }

  @Delete("logs/:id")
  deleteLog(@Param("id") id: string) {
    return this.emailService.deleteLog(id);
  }

  @Post("logs/bulk-delete")
  @HttpCode(200)
  bulkDeleteLogs(@Body("ids") ids: string[]) {
    return this.emailService.bulkDeleteLogs(ids);
  }

  // 8. Test Dispatch
  @Post("test-send")
  @HttpCode(200)
  testSend(@Body() body: any) {
    return this.emailService.sendTestEmail(body);
  }
}

