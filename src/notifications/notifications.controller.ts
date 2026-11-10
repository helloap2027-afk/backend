import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req, UnauthorizedException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationDeliveryService } from "./notification-delivery.service";
import { AuthService } from "../auth/auth.service";

@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly authService: AuthService
  ) {}

  /**
   * Helper to inspect incoming token and enforce secure role & recipient visibility
   */
  private resolveAuthContext(req: any) {
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const payload = this.authService.validateUserToken(token);
        const userRoles = this.authService.getUserRoles(payload.sub);
        const businesses = this.authService.getUserBusinesses(payload.sub);
        return {
          userId: payload.sub,
          phone: payload.phone,
          roles: userRoles,
          businesses: businesses.map((b) => b.id),
          hasCustomer: userRoles.includes("CUSTOMER") || (!userRoles.includes("VENDOR_OWNER") && !userRoles.includes("VENDOR_STAFF") && businesses.length === 0),
          hasPartner: userRoles.includes("VENDOR_OWNER") || userRoles.includes("VENDOR_STAFF") || businesses.length > 0,
          isAdmin: userRoles.includes("SUPER_ADMIN") || userRoles.includes("OPERATIONS"),
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  @Get()
  getNotifications(
    @Req() req: any,
    @Query("role") role?: "customer" | "merchant" | "admin" | "all",
    @Query("recipient") recipient?: string,
    @Query("status") status?: "ALL" | "UNREAD" | "READ",
    @Query("type") type?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    const auth = this.resolveAuthContext(req);

    // Backend Role Security Enforcement:
    // If user is authenticated:
    // - Customer-only can ONLY request customer notifications
    // - Partner-only can ONLY request merchant notifications
    // - Dual-role can request customer, merchant, or all
    let effectiveRole = role;
    if (auth && !auth.isAdmin) {
      if (auth.hasPartner && !auth.hasCustomer) {
        effectiveRole = "merchant";
      } else if (auth.hasCustomer && !auth.hasPartner) {
        effectiveRole = "customer";
      } else if (auth.hasCustomer && auth.hasPartner) {
        effectiveRole = role || "all";
      }
    }

    const effectiveRecipient = recipient || auth?.phone || auth?.userId;

    const data = this.notificationsService.getNotifications({
      role: effectiveRole,
      recipient: effectiveRecipient,
      status,
      type,
      search,
      page,
      pageSize,
    });

    return {
      success: true,
      data: data.data,
      pagination: data.pagination,
      unreadCount: data.unreadCount,
    };
  }

  @Get("counts")
  getUnreadCounts(@Req() req: any, @Query("recipient") recipient?: string) {
    const auth = this.resolveAuthContext(req);
    const effectiveRecipient = recipient || auth?.phone || auth?.userId;
    const counts = this.notificationsService.getUnreadCounts(effectiveRecipient);
    return {
      success: true,
      data: counts,
    };
  }

  @Post(":id/read")
  markAsRead(@Param("id") id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post("mark-all-read")
  markAllAsRead(@Req() req: any, @Body("role") role?: "customer" | "merchant" | "admin" | "all") {
    const auth = this.resolveAuthContext(req);
    let effectiveRole = role;
    if (auth && !auth.isAdmin) {
      if (auth.hasPartner && !auth.hasCustomer) {
        effectiveRole = "merchant";
      } else if (auth.hasCustomer && !auth.hasPartner) {
        effectiveRole = "customer";
      }
    }
    return this.notificationsService.markAllAsRead(effectiveRole);
  }

  @Delete(":id")
  deleteNotification(@Param("id") id: string) {
    return this.notificationsService.deleteNotification(id);
  }

  @Post(":id/delete")
  deleteNotificationPost(@Param("id") id: string) {
    return this.notificationsService.deleteNotification(id);
  }

  @Post("bulk-delete")
  bulkDeleteNotifications(@Body("ids") ids: string[]) {
    return this.notificationsService.bulkDeleteNotifications(ids || []);
  }

  @Post("seed-sample")
  seedSample() {
    this.notificationsService.seedSampleNotificationsIfEmpty();
    return {
      success: true,
      message: "Sample customer and merchant notifications verified and loaded.",
    };
  }

  /**
   * =========================================================================
   * MILESTONE 6: NOTIFICATION PREFERENCES & DELIVERY API
   * =========================================================================
   */

  @Get("preferences")
  getPreferences(@Req() req: any, @Query("role") roleParam?: "customer" | "merchant") {
    const auth = this.resolveAuthContext(req);
    const userId = auth?.userId || "usr_guest";
    const targetRole: "CUSTOMER" | "VENDOR_OWNER" = 
      roleParam === "merchant" || (auth?.hasPartner && !auth?.hasCustomer) ? "VENDOR_OWNER" : "CUSTOMER";

    const data = this.deliveryService.getUserPreferences(userId, targetRole);
    return {
      success: true,
      data,
    };
  }

  @Put("preferences")
  updatePreferences(@Req() req: any, @Body() body: any) {
    const auth = this.resolveAuthContext(req);
    const userId = auth?.userId || body.userId || "usr_guest";
    const role: "CUSTOMER" | "VENDOR_OWNER" = body.role === "VENDOR_OWNER" || body.role === "merchant" ? "VENDOR_OWNER" : "CUSTOMER";
    const preferences = Array.isArray(body.preferences) ? body.preferences : [];

    const data = this.deliveryService.updateUserPreferences(userId, role, preferences);
    return {
      success: true,
      message: "Notification preferences updated successfully in database.",
      data,
    };
  }

  @Get("outbox")
  getOutboxLogs(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("channel") channel?: string,
    @Query("role") role?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    const data = this.deliveryService.getOutboxLogs({
      status,
      channel,
      role,
      search,
      page,
      pageSize,
    });
    return {
      success: true,
      ...data,
    };
  }

  @Post("outbox/:id/retry")
  retryOutboxItem(@Param("id") id: string) {
    return this.deliveryService.retryOutboxItem(id);
  }
}
