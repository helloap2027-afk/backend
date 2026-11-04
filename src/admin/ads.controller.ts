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
import { AdsService } from "./ads.service";

@Controller("admin")
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  // 1. Advertisement Overview
  @Get("ads/overview")
  getOverview(
    @Query("cityId") cityId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    return {
      success: true,
      data: this.adsService.getOverview(cityId, startDate, endDate),
    };
  }

  // 2. Campaign Push Notifications
  @Get("campaigns")
  getCampaigns(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("city") city?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC"
  ) {
    const result = this.adsService.getCampaigns({ page, pageSize, search, status, city, sortBy, sortOrder });
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Post("campaigns")
  createCampaign(
    @Body() body: any,
    @Headers("x-admin-user") adminUser?: string
  ) {
    return {
      success: true,
      data: this.adsService.createCampaign(body, adminUser || "Super Admin"),
    };
  }

  @Put("campaigns/:id")
  updateCampaign(@Param("id") id: string, @Body() body: any) {
    return {
      success: true,
      data: this.adsService.updateCampaign(id, body),
    };
  }

  @Post("campaigns/:id/schedule")
  @HttpCode(200)
  scheduleCampaign(@Param("id") id: string, @Body("scheduledAt") scheduledAt?: string) {
    return {
      success: true,
      data: this.adsService.scheduleCampaign(id, scheduledAt),
    };
  }

  @Post("campaigns/:id/cancel")
  @HttpCode(200)
  cancelCampaign(@Param("id") id: string) {
    return this.adsService.cancelCampaign(id);
  }

  @Post("campaigns/:id/duplicate")
  @HttpCode(200)
  duplicateCampaign(@Param("id") id: string, @Headers("x-admin-user") adminUser?: string) {
    return {
      success: true,
      data: this.adsService.duplicateCampaign(id, adminUser || "Super Admin"),
    };
  }

  @Delete("campaigns/:id")
  deleteCampaign(@Param("id") id: string) {
    return this.adsService.deleteCampaign(id);
  }

  // 3. Coupons Management
  @Get("coupons")
  getCoupons(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("discountType") discountType?: string
  ) {
    const result = this.adsService.getCoupons({ page, pageSize, search, status, discountType });
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Post("coupons")
  createCoupon(
    @Body() body: any,
    @Headers("x-admin-user") adminUser?: string
  ) {
    return {
      success: true,
      data: this.adsService.createCoupon(body, adminUser || "Super Admin"),
    };
  }

  @Put("coupons/:id")
  updateCoupon(@Param("id") id: string, @Body() body: any) {
    return {
      success: true,
      data: this.adsService.updateCoupon(id, body),
    };
  }

  @Post("coupons/:id/status")
  @HttpCode(200)
  toggleCouponStatus(@Param("id") id: string, @Body("status") status: "ACTIVE" | "INACTIVE") {
    return this.adsService.toggleCouponStatus(id, status);
  }

  @Get("coupons/:id/redemptions")
  getCouponRedemptions(
    @Param("id") id: string,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number
  ) {
    const result = this.adsService.getCouponRedemptions(id, page, pageSize);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  // 4. In-App Notifications
  @Get("in-app-notifications")
  getInAppNotifications(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string
  ) {
    const result = this.adsService.getInAppNotifications({ page, pageSize, search, status });
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Post("in-app-notifications")
  createInAppNotification(@Body() body: any, @Headers("x-admin-user") adminUser?: string) {
    return {
      success: true,
      data: this.adsService.createInAppNotification(body, adminUser || "Super Admin"),
    };
  }

  @Put("in-app-notifications/:id")
  updateInAppNotification(@Param("id") id: string, @Body() body: any) {
    return {
      success: true,
      data: this.adsService.updateInAppNotification(id, body),
    };
  }

  @Delete("in-app-notifications/:id")
  deleteInAppNotification(@Param("id") id: string) {
    return this.adsService.deleteInAppNotification(id);
  }

  // 5. Normal Push Templates
  @Get("push-templates")
  getPushTemplates() {
    return {
      success: true,
      data: this.adsService.getPushTemplates(),
    };
  }

  @Put("push-templates/:id")
  updatePushTemplate(@Param("id") id: string, @Body() body: any) {
    return {
      success: true,
      data: this.adsService.updatePushTemplate(id, body),
    };
  }

  @Post("campaigns/bulk-delete")
  @HttpCode(200)
  bulkDeleteCampaigns(@Body("ids") ids: string[]) {
    return this.adsService.bulkDeleteCampaigns(ids || []);
  }

  @Post("coupons/bulk-delete")
  @HttpCode(200)
  bulkDeleteCoupons(@Body("ids") ids: string[]) {
    return this.adsService.bulkDeleteCoupons(ids || []);
  }

  @Post("in-app-notifications/bulk-delete")
  @HttpCode(200)
  bulkDeleteInAppNotifications(@Body("ids") ids: string[]) {
    return this.adsService.bulkDeleteInAppNotifications(ids || []);
  }

  @Get("normal-push-logs")
  getNormalPushLogs(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("eventType") eventType?: string,
    @Query("recipientType") recipientType?: string,
    @Query("status") status?: string
  ) {
    const result = this.adsService.getNormalPushLogs({ page, pageSize, search, eventType, recipientType, status });
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }
}

