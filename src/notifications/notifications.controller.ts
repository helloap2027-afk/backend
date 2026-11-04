import { Controller, Get, Post, Delete, Param, Query, Body } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(
    @Query("role") role?: "customer" | "merchant" | "admin" | "all",
    @Query("recipient") recipient?: string,
    @Query("status") status?: "ALL" | "UNREAD" | "READ",
    @Query("type") type?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    const data = this.notificationsService.getNotifications({
      role,
      recipient,
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
  getUnreadCounts(@Query("recipient") recipient?: string) {
    const counts = this.notificationsService.getUnreadCounts(recipient);
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
  markAllAsRead(@Body("role") role?: "customer" | "merchant" | "admin" | "all") {
    return this.notificationsService.markAllAsRead(role);
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
}

