import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Req, Res, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import * as fs from "node:fs";
import { AdminService } from "./admin.service";
import { AuthService } from "../auth/auth.service";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService
  ) {}

  private extractAdminActor(req: any): string {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = this.authService.validateUserToken(token);
      if (!payload.roles?.includes("SUPER_ADMIN") && !payload.roles?.includes("OPERATIONS")) {
        throw new ForbiddenException("Super Admin authorization required");
      }
      return payload.sub;
    }

    if (process.env.NODE_ENV !== "production") {
      const devAdminHeader = req.headers["x-admin-id"];
      if (devAdminHeader) {
        return devAdminHeader;
      }
    }

    throw new UnauthorizedException("Missing or invalid Administrator Bearer token");
  }

  @Post("auth/login")
  async adminLogin(@Body() body: any, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress || "127.0.0.1";
    const data = await this.authService.adminLogin(
      body.email,
      body.password,
      body.deviceInfo || "Admin Console",
      ip
    );
    return {
      success: true,
      data
    };
  }

  @Post("auth/mfa/verify")
  async verifyAdminMfa(@Body() body: any, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress || "127.0.0.1";
    const data = await this.authService.verifyAdminMfa(
      body.mfaChallengeId,
      body.code,
      body.deviceInfo || "Admin Console",
      ip
    );
    return {
      success: true,
      data
    };
  }

  // =========================================================================
  // CUSTOMERS MANAGEMENT ENDPOINTS
  // =========================================================================

  @Get("customers")
  getCustomers(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string
  ) {
    const res = this.adminService.getCustomers({ page, pageSize, search, status });
    return {
      success: true,
      ...res,
    };
  }

  @Get("customers/:id")
  getCustomerById(@Param("id") id: string) {
    return {
      success: true,
      data: this.adminService.getCustomerById(id),
    };
  }

  @Post("customers/:id/delete")
  deleteCustomer(@Param("id") id: string) {
    return this.adminService.deleteCustomer(id);
  }

  @Post("customers/bulk-delete")
  bulkDeleteCustomers(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteCustomers(body.ids);
  }

  // =========================================================================
  // MERCHANTS MANAGEMENT ENDPOINTS
  // =========================================================================

  @Get("merchants")
  getMerchants(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("kyc") kyc?: string
  ) {
    const res = this.adminService.getMerchants({ page, pageSize, search, status, kyc });
    return {
      success: true,
      ...res,
    };
  }

  @Get("merchants/:id")
  getMerchantById(@Param("id") id: string) {
    return {
      success: true,
      data: this.adminService.getMerchantById(id),
    };
  }

  @Put("merchants/:id")
  putMerchant(@Param("id") id: string, @Body() body: any) {
    const data = this.adminService.updateMerchant(id, body);
    return {
      success: true,
      data,
      message: "Merchant details updated successfully.",
    };
  }

  @Patch("merchants/:id")
  patchMerchant(@Param("id") id: string, @Body() body: any) {
    const data = this.adminService.updateMerchant(id, body);
    return {
      success: true,
      data,
      message: "Merchant details updated successfully.",
    };
  }

  @Post("merchants/:id/delete")
  deleteMerchant(@Param("id") id: string) {
    return this.adminService.deleteMerchant(id);
  }

  @Post("merchants/bulk-delete")
  bulkDeleteMerchants(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteMerchants(body.ids);
  }

  @Get("dashboard/stats")
  getDashboardStats() {
    return {
      success: true,
      data: this.adminService.getDashboardStats(),
    };
  }

  @Get("businesses")
  getAllBusinesses(@Query() query: any) {
    return {
      success: true,
      data: this.adminService.getAllBusinesses(query),
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
  approveBusiness(@Param("id") id: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.approveBusiness(id, actorId);
  }

  @Post("businesses/:id/reject")
  rejectBusiness(@Param("id") id: string, @Body("reason") reason: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.rejectBusiness(id, reason || "Documents failed validation", actorId);
  }

  @Post("businesses/:id/kyc-reminder")
  sendKycReminder(@Param("id") id: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.sendKycReminder(id, actorId);
  }

  @Post("businesses/:id/suspend")
  suspendBusiness(@Param("id") id: string, @Body("reason") reason: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.suspendBusiness(id, reason || "Administrative suspension", actorId);
  }

  @Post("businesses/:id/unpublish")
  unpublishBusiness(@Param("id") id: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.unpublishBusiness(id, actorId);
  }

  @Post("businesses/:id/publish")
  publishBusiness(@Param("id") id: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.publishBusiness(id, actorId);
  }

  @Get("kyc/documents/:documentId/file")
  getKycDocumentFile(@Param("documentId") documentId: string, @Res() res: any) {
    const { filePath, mimeType, fileName } = this.adminService.getKycDocumentFile(documentId);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
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

  @Post("subscriptions/plans")
  createSubscriptionPlan(@Body() body: any, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.createSubscriptionPlan(body, actorId);
  }

  @Put("subscriptions/plans/:id")
  updateSubscriptionPlan(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.updateSubscriptionPlan(id, body, actorId);
  }

  @Delete("subscriptions/plans/:id")
  deleteSubscriptionPlan(@Param("id") id: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.deleteSubscriptionPlan(id, actorId);
  }

  // =========================================================================
  // ENTERPRISE STAGE 1: BENEFITS LIBRARY & CAPABILITIES API
  // =========================================================================

  @Get("subscriptions/capabilities")
  getBackendCapabilities() {
    return {
      success: true,
      data: this.adminService.getBackendCapabilities(),
    };
  }

  @Get("subscriptions/benefits")
  getBenefitDefinitions(@Query() query: any) {
    return {
      success: true,
      data: this.adminService.getBenefitDefinitions(query),
    };
  }

  @Get("subscriptions/benefits/:id")
  getBenefitById(@Param("id") id: string) {
    return {
      success: true,
      data: this.adminService.getBenefitById(id),
    };
  }

  @Post("subscriptions/benefits")
  createBenefitDefinition(@Body() body: any, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.createBenefitDefinition(body, actorId);
  }

  @Put("subscriptions/benefits/:id")
  updateBenefitDefinition(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.updateBenefitDefinition(id, body, actorId);
  }

  @Get("subscriptions/plans/:id/details")
  getPlanDetailsWithBenefits(@Param("id") id: string) {
    return {
      success: true,
      data: this.adminService.getPlanDetailsWithBenefits(id),
    };
  }

  @Post("subscriptions/plans/:id/benefits")
  assignBenefitsToPlan(@Param("id") id: string, @Body("benefits") benefits: any[], @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.assignBenefitsToPlan(id, benefits, actorId);
  }

  @Post("subscriptions/plans/:id/publish")
  publishPlanVersion(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.publishPlanVersion(id, body, actorId);
  }

  @Get("subscriptions/:id")
  getSubscriptionById(@Param("id") id: string) {
    return {
      success: true,
      data: this.adminService.getSubscriptionById(id),
    };
  }

  @Delete("subscriptions/:id")
  deleteSubscription(@Param("id") id: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.deleteSubscription(id, actorId);
  }

  @Post("subscriptions/bulk-delete")
  bulkDeleteSubscriptions(@Body("ids") ids: string[], @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.bulkDeleteSubscriptions(ids, actorId);
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

  // =========================================================================
  // ROLES & PERMISSIONS MANAGEMENT ENDPOINTS (STAGE 1)
  // =========================================================================

  @Get("rbac/permissions")
  getPermissionCatalog() {
    return {
      success: true,
      data: this.adminService.getPermissionCatalog(),
    };
  }

  @Get("rbac/roles")
  getRoles() {
    return {
      success: true,
      data: this.adminService.getRoles(),
    };
  }

  @Get("rbac/roles/:id")
  getRoleDetails(@Param("id") id: string) {
    return {
      success: true,
      data: this.adminService.getRoleDetails(id),
    };
  }

  @Post("rbac/roles")
  createRole(@Body() body: any, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.createRole(body, actorId);
  }

  @Put("rbac/roles/:id")
  updateRole(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.updateRole(id, body, actorId);
  }

  @Delete("rbac/roles/:id")
  deleteRole(@Param("id") id: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.deleteRole(id, actorId);
  }

  @Get("rbac/administrators")
  getAdministrators(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string
  ) {
    const res = this.adminService.getAdministrators({ page, pageSize, search, status });
    return {
      success: true,
      data: res,
    };
  }

  @Put("rbac/administrators/:id/role")
  assignAdminRole(@Param("id") id: string, @Body("roleId") roleId: string, @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.assignAdminRole(id, roleId, actorId);
  }

  @Put("rbac/administrators/:id/status")
  updateAdminStatus(@Param("id") id: string, @Body("status") status: "ACTIVE" | "SUSPENDED", @Req() req: any) {
    const actorId = this.extractAdminActor(req);
    return this.adminService.updateAdminStatus(id, status, actorId);
  }

  @Get("rbac/audit-logs")
  getAdminAuditLogs(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string
  ) {
    const res = this.adminService.getAdminAuditLogs({ page, pageSize, search });
    return {
      success: true,
      data: res,
    };
  }

}
