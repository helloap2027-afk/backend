import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import {
  SupportTicketsService,
  CreateTicketDto,
  AddMessageDto,
  AssignTicketDto,
  ResolveTicketDto,
} from "./support-tickets.service";

@Controller("support-tickets")
export class SupportTicketsController {
  constructor(private readonly ticketsService: SupportTicketsService) {}

  /**
   * Helper to decode user identity from Authorization Bearer or simulated token
   */
  private extractUser(headers: any): { id: string; role: string; fullName: string; isAdmin?: boolean } | null {
    const authHeader = headers["authorization"] || headers["Authorization"];
    const customUserId = headers["x-user-id"];
    const customRole = headers["x-user-role"];

    if (customUserId) {
      return {
        id: customUserId,
        role: customRole || "CUSTOMER",
        fullName: headers["x-user-name"] || "Authorized User",
        isAdmin: ["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT"].includes(customRole || ""),
      };
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        // If JWT or base64
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
          return {
            id: payload.sub || payload.id,
            role: payload.role || "CUSTOMER",
            fullName: payload.fullName || payload.name || "User",
            isAdmin: ["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT"].includes(payload.role || ""),
          };
        }
      } catch {
        // ignore parse error
      }
    }

    return null;
  }

  // =========================================================================
  // CONSUMER ROUTES: WEBSITE & MOBILE
  // =========================================================================

  @Post()
  createTicket(@Body() dto: CreateTicketDto, @Headers() headers: any) {
    const user = this.extractUser(headers);
    return this.ticketsService.createTicket(dto, user || undefined);
  }

  @Post("tickets")
  createTicketAlias(@Body() dto: CreateTicketDto, @Headers() headers: any) {
    const user = this.extractUser(headers);
    return this.ticketsService.createTicket(dto, user || undefined);
  }

  @Get("my-tickets")
  getMyTickets(@Headers() headers: any, @Query("role") roleParam?: string) {
    const user = this.extractUser(headers);
    if (!user) {
      return { success: true, data: [] };
    }
    const role = roleParam || user.role || "CUSTOMER";
    const data = this.ticketsService.getUserTickets(user.id, role);
    return { success: true, data };
  }

  @Get(":id")
  getTicketDetails(@Param("id") id: string, @Headers() headers: any) {
    const user = this.extractUser(headers);
    return this.ticketsService.getTicketDetails(id, user || undefined);
  }

  @Post(":id/messages")
  addMessage(
    @Param("id") id: string,
    @Body() dto: AddMessageDto,
    @Headers() headers: any
  ) {
    const user = this.extractUser(headers);
    if (!user) {
      throw new UnauthorizedException("Authentication required to reply to ticket.");
    }
    return this.ticketsService.addMessage(id, dto, {
      id: user.id,
      name: user.fullName,
      role: user.role,
      isAdmin: user.isAdmin,
    });
  }

  @Post(":id/reopen")
  reopenTicket(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @Headers() headers: any
  ) {
    const user = this.extractUser(headers);
    if (!user) {
      throw new UnauthorizedException("Authentication required to reopen ticket.");
    }
    return this.ticketsService.reopenTicket(id, body.reason || "Reopened by user", {
      id: user.id,
      name: user.fullName,
      role: user.role,
    });
  }

  // =========================================================================
  // SUPER ADMIN SUPPORT DESK ROUTES
  // =========================================================================

  @Get("admin/overview")
  getAdminOverview() {
    return this.ticketsService.getAdminOverview();
  }

  @Get("admin/tickets")
  getAdminTickets(
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("audience") audience?: string,
    @Query("department") department?: string,
    @Query("assignedTo") assignedTo?: string,
    @Query("unassignedOnly") unassignedOnly?: string,
    @Query("escalatedOnly") escalatedOnly?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ) {
    return this.ticketsService.getAdminTickets({
      status,
      priority,
      audience,
      department,
      assignedTo,
      unassignedOnly: unassignedOnly === "true",
      escalatedOnly: escalatedOnly === "true",
      search,
      page,
      limit,
    });
  }

  @Patch("admin/tickets/:id/assign")
  assignTicket(
    @Param("id") id: string,
    @Body() dto: AssignTicketDto,
    @Headers() headers: any
  ) {
    const user = this.extractUser(headers);
    const adminUser = user
      ? { id: user.id, name: user.fullName, role: user.role }
      : { id: "admin-system", name: "Support Admin", role: "SUPER_ADMIN" };
    return this.ticketsService.assignTicket(id, dto, adminUser);
  }

  @Patch("admin/tickets/:id/escalate")
  escalateTicket(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @Headers() headers: any
  ) {
    const user = this.extractUser(headers);
    const adminUser = user
      ? { id: user.id, name: user.fullName, role: user.role }
      : { id: "admin-system", name: "Support Admin", role: "SUPER_ADMIN" };
    return this.ticketsService.escalateTicket(id, body.reason || "Escalation requested", adminUser);
  }

  @Patch("admin/tickets/:id/resolve")
  resolveTicket(
    @Param("id") id: string,
    @Body() dto: ResolveTicketDto,
    @Headers() headers: any
  ) {
    const user = this.extractUser(headers);
    const adminUser = user
      ? { id: user.id, name: user.fullName, role: user.role }
      : { id: "admin-system", name: "Support Admin", role: "SUPER_ADMIN" };
    return this.ticketsService.resolveTicket(id, dto, adminUser);
  }

  @Get("admin/canned-responses")
  getCannedResponses(@Query("audience") audience?: string) {
    return this.ticketsService.getCannedResponses(audience);
  }

  @Post("admin/canned-responses")
  createCannedResponse(@Body() body: { title: string; category: string; audience: string; bodyText: string }) {
    return this.ticketsService.createCannedResponse(body);
  }

  @Get("admin/departments")
  getDepartments() {
    return this.ticketsService.getDepartments();
  }

  @Get("admin/agents")
  getSupportAgents() {
    return this.ticketsService.getSupportAgents();
  }
}
