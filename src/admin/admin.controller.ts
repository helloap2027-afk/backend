import { Controller, Get, Post, Put, Param, Body, Query, Req } from "@nestjs/common";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard/stats")
  getDashboardStats() {
    return {
      success: true,
      data: this.adminService.getDashboardStats(),
    };
  }

  @Get("businesses/pending")
  getPendingQueue() {
    return {
      success: true,
      data: this.adminService.getPendingQueue(),
    };
  }

  @Post("businesses/:id/approve")
  approveBusiness(@Param("id") id: string) {
    return this.adminService.approveBusiness(id);
  }

  @Post("businesses/:id/reject")
  rejectBusiness(@Param("id") id: string, @Body("reason") reason: string) {
    return this.adminService.rejectBusiness(id, reason || "Documents failed validation");
  }

  @Get("audit-logs")
  getAuditLogs() {
    return {
      success: true,
      data: this.adminService.getAuditLogs(),
    };
  }

  @Get("enquiries")
  getAllEnquiries() {
    return {
      success: true,
      data: this.adminService.getAllEnquiries(),
    };
  }

  // =========================================================================
  // PROFILE, ACCOUNT SETTINGS & LOGOUT ENDPOINTS
  // =========================================================================

  @Get("profile")
  getAdminProfile(@Req() req: any) {
    const email = (req.query?.email as string) || "admin@hello-hi.in";
    return {
      success: true,
      data: this.adminService.getAdminProfile(email),
    };
  }

  @Put("profile")
  updateAdminProfile(@Body() body: any) {
    return {
      success: true,
      data: this.adminService.updateAdminProfile(body),
    };
  }

  @Post("change-password")
  changeAdminPassword(@Body() body: any) {
    return this.adminService.changeAdminPassword(body);
  }

  @Post("logout")
  adminLogout(@Body() body: any) {
    return this.adminService.adminLogout(body);
  }

  // =========================================================================
  // PAYMENTS ENDPOINTS
  // =========================================================================

  @Get("payments")
  getPayments(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("paymentMethod") paymentMethod?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string
  ) {
    const res = this.adminService.getPayments({
      page,
      pageSize,
      search,
      status,
      paymentMethod,
      sortBy,
      sortOrder,
    });
    return {
      success: true,
      ...res,
    };
  }

  @Get("payments/:id")
  getPaymentById(@Param("id") id: string) {
    return {
      success: true,
      data: this.adminService.getPaymentById(id),
    };
  }

  // =========================================================================
  // SUBSCRIPTIONS ENDPOINTS
  // =========================================================================

  @Get("subscriptions")
  getSubscriptions(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("planId") planId?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string
  ) {
    const res = this.adminService.getSubscriptions({
      page,
      pageSize,
      search,
      status,
      planId,
      sortBy,
      sortOrder,
    });
    return {
      success: true,
      ...res,
    };
  }

  @Get("subscriptions/plans")
  getSubscriptionPlans() {
    return {
      success: true,
      data: this.adminService.getSubscriptionPlans(),
    };
  }

  @Get("subscriptions/:id")
  getSubscriptionById(@Param("id") id: string) {
    return {
      success: true,
      data: this.adminService.getSubscriptionById(id),
    };
  }

  // =========================================================================
  // NOTIFICATIONS ENDPOINTS
  // =========================================================================

  @Get("notifications")
  getNotifications(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("type") type?: string
  ) {
    const res = this.adminService.getNotifications({
      page,
      pageSize,
      search,
      status,
      type,
    });
    return {
      success: true,
      ...res,
    };
  }

  @Post("notifications/mark-all-read")
  markAllNotificationsAsRead() {
    return this.adminService.markAllNotificationsAsRead();
  }

  @Post("notifications/:id/read")
  markNotificationAsRead(@Param("id") id: string) {
    return this.adminService.markNotificationAsRead(id);
  }
}


