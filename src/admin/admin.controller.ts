import { Controller, Get, Post, Put, Param, Body, Query, Req, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AuthService } from "../auth/auth.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/decorators/roles.decorator";

@Controller("admin")
export class AdminController {

  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService
  ) {}

  @Post("auth/login")
  async adminLogin(@Body() body: any, @Req() req: any) {
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
    const data = await this.authService.adminLogin(body.email, body.password, body.deviceInfo, ip);
    return {
      success: true,
      data
    };
  }

  @Post("auth/mfa/verify")
  async verifyAdminMfa(@Body() body: any, @Req() req: any) {
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
    const data = await this.authService.verifyAdminMfa(body.mfaChallengeId, body.code, body.deviceInfo, ip);
    return {
      success: true,
      data
    };
  }

  @Post("auth/logout")
  @UseGuards(AuthGuard)
  async adminAuthLogout(@CurrentUser("sub") userId: string, @Body() body: any) {
    return this.authService.logout(userId, body.refreshToken);
  }

  @Get("auth/me")
  @UseGuards(AuthGuard)
  async getAdminMe(@CurrentUser("sub") userId: string) {
    const data = this.authService.getUserProfile(userId);
    return {
      success: true,
      data
    };
  }


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

  // =========================================================================
  // WALLET TRANSACTIONS ENDPOINTS
  // =========================================================================

  @Get("payments/wallet-transactions")
  getWalletTransactions(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("userType") userType?: string
  ) {
    const res = this.adminService.getWalletTransactions({
      page,
      pageSize,
      search,
      type,
      status,
      userType,
    });
    return { success: true, ...res };
  }

  @Post("payments/wallet-transactions/bulk-delete")
  bulkDeleteWalletTransactions(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteWalletTransactions(body.ids || []);
  }

  @Post("payments/wallet-transactions/:id/delete")
  deleteWalletTransaction(@Param("id") id: string) {
    return this.adminService.deleteWalletTransaction(id);
  }

  // =========================================================================
  // WITHDRAWALS ENDPOINTS
  // =========================================================================

  @Get("payments/withdrawals")
  getWithdrawals(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string
  ) {
    const res = this.adminService.getWithdrawals({
      page,
      pageSize,
      search,
      status,
    });
    return { success: true, ...res };
  }

  @Post("payments/withdrawals/bulk-delete")
  bulkDeleteWithdrawals(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteWithdrawals(body.ids || []);
  }

  @Put("payments/withdrawals/:id/status")
  updateWithdrawalStatus(
    @Param("id") id: string,
    @Body() body: { status: string; payoutRef?: string }
  ) {
    return this.adminService.updateWithdrawalStatus(id, body.status, body.payoutRef);
  }

  @Post("payments/withdrawals/:id/delete")
  deleteWithdrawal(@Param("id") id: string) {
    return this.adminService.deleteWithdrawal(id);
  }

  // =========================================================================
  // PLANS PURCHASED (SUBSCRIPTIONS) ENDPOINTS
  // =========================================================================

  @Get("payments/plans-purchased")
  getPlansPurchased(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string
  ) {
    const res = this.adminService.getPlansPurchased({
      page,
      pageSize,
      search,
      status,
    });
    return { success: true, ...res };
  }

  @Post("payments/plans-purchased/bulk-delete")
  bulkDeletePlansPurchased(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeletePlansPurchased(body.ids || []);
  }

  @Post("payments/plans-purchased/:id/delete")
  deletePlanPurchased(@Param("id") id: string) {
    return this.adminService.deletePlanPurchased(id);
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

  @Post("notifications/bulk-delete")
  bulkDeleteNotifications(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteNotifications(body.ids || []);
  }

  @Post("notifications/:id/delete")
  deleteNotification(@Param("id") id: string) {
    return this.adminService.deleteNotification(id);
  }

  // =========================================================================
  // CUSTOMER MANAGEMENT ENDPOINTS (SERVER-SIDE SEARCH, FILTER, PAGINATION, CRUD)
  // =========================================================================

  @Get("customers")
  getCustomers(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("city") city?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string
  ) {
    const res = this.adminService.getCustomers({
      page,
      pageSize,
      search,
      status,
      city,
      sortBy,
      sortOrder,
    });
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

  @Put("customers/:id")
  updateCustomer(@Param("id") id: string, @Body() body: any) {
    const data = this.adminService.updateCustomer(id, body);
    return {
      success: true,
      message: "Customer profile updated successfully",
      data,
    };
  }

  @Post("customers/bulk-delete")
  bulkDeleteCustomers(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteCustomers(body.ids || []);
  }

  @Post("customers/:id/delete")
  deleteCustomer(@Param("id") id: string) {
    return this.adminService.deleteCustomer(id);
  }

  // =========================================================================
  // MERCHANT MANAGEMENT ENDPOINTS (SERVER-SIDE SEARCH, FILTER, PAGINATION, CRUD)
  // =========================================================================

  @Get("merchants")
  getMerchants(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("kyc") kyc?: string,
    @Query("category") category?: string,
    @Query("city") city?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string
  ) {
    const res = this.adminService.getMerchants({
      page,
      pageSize,
      search,
      status,
      kyc,
      category,
      city,
      sortBy,
      sortOrder,
    });
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
  updateMerchant(@Param("id") id: string, @Body() body: any) {
    const data = this.adminService.updateMerchant(id, body);
    return {
      success: true,
      message: "Merchant business details updated successfully",
      data,
    };
  }

  @Post("merchants/bulk-delete")
  bulkDeleteMerchants(@Body() body: { ids: string[] }) {
    return this.adminService.bulkDeleteMerchants(body.ids || []);
  }

  @Post("merchants/:id/delete")
  deleteMerchant(@Param("id") id: string) {
    return this.adminService.deleteMerchant(id);
  }
}
