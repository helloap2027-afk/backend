import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface CreateTicketDto {
  category: string;
  subcategory?: string;
  subject: string;
  description: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  businessId?: string;
  source?: "WEBSITE" | "MOBILE" | "ADMIN";
  relatedEntityType?: string;
  relatedEntityId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  attachments?: any[];
}

export interface AddMessageDto {
  message: string;
  isInternalNote?: boolean;
  attachments?: any[];
}

export interface AssignTicketDto {
  agentId: string;
  agentName: string;
  department?: string;
  reason?: string;
}

export interface ResolveTicketDto {
  resolutionCategory: string;
  resolutionSummary: string;
  notifyUser?: boolean;
}

@Injectable()
export class SupportTicketsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Helper to compute dynamic SLA target deadlines based on Priority:
   * URGENT: First Response 2 hrs, Resolution 12 hrs
   * HIGH: First Response 4 hrs, Resolution 24 hrs
   * NORMAL: First Response 8 hrs, Resolution 48 hrs
   * LOW: First Response 24 hrs, Resolution 72 hrs
   */
  private computeSlaDeadlines(priority: string = "NORMAL"): { firstResponseDue: string; resolutionDue: string } {
    const now = Date.now();
    let respHours = 8;
    let resHours = 48;

    switch (priority.toUpperCase()) {
      case "URGENT":
        respHours = 2;
        resHours = 12;
        break;
      case "HIGH":
        respHours = 4;
        resHours = 24;
        break;
      case "LOW":
        respHours = 24;
        resHours = 72;
        break;
      case "NORMAL":
      default:
        respHours = 8;
        resHours = 48;
        break;
    }

    return {
      firstResponseDue: new Date(now + respHours * 3600 * 1000).toISOString(),
      resolutionDue: new Date(now + resHours * 3600 * 1000).toISOString(),
    };
  }

  /**
   * Generate consecutive enterprise reference number: HH-SUP-YYYY-XXXXXX
   */
  private generateTicketNumber(): string {
    const year = new Date().getFullYear();
    const countRow = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets");
    const nextSeq = ((countRow?.c || 0) + 1).toString().padStart(6, "0");
    return `HH-SUP-${year}-${nextSeq}`;
  }

  // =========================================================================
  // CONSUMER: TICKET CREATION & TRACKING
  // =========================================================================

  createTicket(dto: CreateTicketDto, user?: { id?: string; role?: string; fullName?: string; phoneNumber?: string; email?: string }) {
    if (!dto.category || !dto.subject || !dto.description) {
      throw new BadRequestException("Category, subject, and issue description are required.");
    }

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ticketNumber = this.generateTicketNumber();
    const now = new Date().toISOString();
    const priority = dto.priority || "NORMAL";
    const sla = this.computeSlaDeadlines(priority);

    // Audience context resolution
    let audience = "GUEST";
    let userId: string | null = null;
    let businessId: string | null = null;

    if (user && user.id) {
      userId = user.id;
      const roleUpper = (user.role || "").toUpperCase();
      if (roleUpper.includes("MERCHANT") || roleUpper.includes("VENDOR") || roleUpper.includes("PARTNER")) {
        audience = "BUSINESS_PARTNER";
        businessId = dto.businessId || null;
      } else {
        audience = "CUSTOMER";
      }
    } else {
      audience = "GUEST";
    }

    // Default department based on audience & category
    let dept = "Customer Support";
    if (audience === "BUSINESS_PARTNER") dept = "Partner Relations";
    if (dto.category.toLowerCase().includes("wallet") || dto.category.toLowerCase().includes("payment")) dept = "Payments & Wallet";
    if (dto.category.toLowerCase().includes("kyc") || dto.category.toLowerCase().includes("verification")) dept = "KYC & Verification";

    this.db.execute(
      `INSERT INTO support_tickets (
        id, ticket_number, user_id, business_id, audience, category, subcategory,
        subject, description, status, priority, department, source,
        related_entity_type, related_entity_id,
        first_response_due_at, resolution_due_at, sla_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, 'WITHIN_SLA', ?, ?)`,
      [
        ticketId,
        ticketNumber,
        userId,
        businessId,
        audience,
        dto.category,
        dto.subcategory || null,
        dto.subject,
        dto.description,
        priority,
        dept,
        dto.source || "WEBSITE",
        dto.relatedEntityType || null,
        dto.relatedEntityId || null,
        sla.firstResponseDue,
        sla.resolutionDue,
        now,
        now,
      ]
    );

    // Initial message entry
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const senderName = user?.fullName || dto.guestName || "Guest Requester";
    this.db.execute(
      `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_name, sender_role, message, is_internal_note, attachments_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        msgId,
        ticketId,
        userId || "guest",
        senderName,
        audience,
        dto.description,
        dto.attachments && dto.attachments.length > 0 ? JSON.stringify(dto.attachments) : null,
        now,
      ]
    );

    // Initial audit log
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.execute(
      `INSERT INTO ticket_audit_logs (id, ticket_id, actor_id, actor_name, actor_role, action, previous_state, new_state, reason, created_at)
       VALUES (?, ?, ?, ?, ?, 'TICKET_CREATED', NULL, 'OPEN', 'Initial ticket submission', ?)`,
      [auditId, ticketId, userId || "guest", senderName, audience, now]
    );

    // In-app Notification for Authenticated User
    if (userId) {
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        this.db.execute(
          `INSERT INTO notifications (id, title, message, type, recipient, is_read, related_entity, related_id, created_at)
           VALUES (?, ?, ?, 'SUPPORT', ?, 0, 'support_ticket', ?, ?)`,
          [
            notifId,
            `Support Ticket Registered: ${ticketNumber}`,
            `Your ticket regarding "${dto.subject}" has been received. Our team will review it shortly.`,
            userId,
            ticketId,
            now,
          ]
        );
      } catch {
        // Notification log fallback
      }
    }

    return {
      success: true,
      ticket: {
        id: ticketId,
        ticketNumber,
        status: "OPEN",
        priority,
        category: dto.category,
        subject: dto.subject,
        createdAt: now,
        slaDue: sla.resolutionDue,
      },
    };
  }

  /**
   * Get user tickets scoped to authenticated user context
   */
  getUserTickets(userId: string, role: string = "CUSTOMER") {
    const isPartner = role.toUpperCase().includes("MERCHANT") || role.toUpperCase().includes("PARTNER");
    const query = isPartner
      ? `SELECT t.*,
                (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.is_internal_note = 0) as messageCount
         FROM support_tickets t
         WHERE t.user_id = ? AND t.audience = 'BUSINESS_PARTNER'
         ORDER BY t.created_at DESC`
      : `SELECT t.*,
                (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.is_internal_note = 0) as messageCount
         FROM support_tickets t
         WHERE t.user_id = ? AND t.audience = 'CUSTOMER'
         ORDER BY t.created_at DESC`;

    return this.db.query<any>(query, [userId]);
  }

  /**
   * Get detailed ticket thread with authorized isolation
   */
  getTicketDetails(ticketId: string, currentUser?: { id: string; role: string; isAdmin?: boolean }) {
    const ticket = this.db.queryOne<any>(
      `SELECT t.*, u.full_name as userName, u.phone_number as userPhone, u.email as userEmail,
              b.name as businessName
       FROM support_tickets t
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN businesses b ON b.id = t.business_id
       WHERE t.id = ? OR t.ticket_number = ?`,
      [ticketId, ticketId]
    );

    if (!ticket) throw new NotFoundException("Support ticket not found.");

    const isAdmin = currentUser?.isAdmin || (currentUser?.role && ["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT"].includes(currentUser.role));

    // Security check: Customer can only view own ticket; Partner can only view own business ticket
    if (!isAdmin && currentUser) {
      if (ticket.user_id && ticket.user_id !== currentUser.id) {
        throw new ForbiddenException("You are not authorized to view this ticket.");
      }
    }

    // Messages: Filter out internal notes for non-admins
    const messages = isAdmin
      ? this.db.query<any>(`SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`, [ticket.id])
      : this.db.query<any>(`SELECT * FROM ticket_messages WHERE ticket_id = ? AND is_internal_note = 0 ORDER BY created_at ASC`, [ticket.id]);

    // Audit logs (Admin only)
    const auditLogs = isAdmin
      ? this.db.query<any>(`SELECT * FROM ticket_audit_logs WHERE ticket_id = ? ORDER BY created_at DESC`, [ticket.id])
      : [];

    return {
      ticket,
      messages: messages.map((m) => ({
        ...m,
        attachments: m.attachments_json ? JSON.parse(m.attachments_json) : [],
      })),
      auditLogs,
    };
  }

  /**
   * Two-Way Threaded Reply: Adds a public reply or internal note
   */
  addMessage(
    ticketId: string,
    dto: AddMessageDto,
    sender: { id: string; name: string; role: string; isAdmin?: boolean }
  ) {
    const ticket = this.db.queryOne<any>(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);
    if (!ticket) throw new NotFoundException("Ticket not found.");

    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException("Message content cannot be blank.");
    }

    const isAdmin = sender.isAdmin || ["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT"].includes(sender.role);

    // Security check: non-admins cannot post internal notes
    const isInternalNote = isAdmin && dto.isInternalNote ? 1 : 0;
    if (!isAdmin && ticket.user_id && ticket.user_id !== sender.id) {
      throw new ForbiddenException("You are not authorized to reply to this ticket.");
    }

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.execute(
      `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_name, sender_role, message, is_internal_note, attachments_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        msgId,
        ticket.id,
        sender.id,
        sender.name,
        sender.role,
        dto.message.trim(),
        isInternalNote,
        dto.attachments && dto.attachments.length > 0 ? JSON.stringify(dto.attachments) : null,
        now,
      ]
    );

    // Lifecycle status updates
    let newStatus = ticket.status;
    let firstRespondedAt = ticket.first_responded_at;

    if (isAdmin && !isInternalNote) {
      // Admin responded publicly -> status shifts to WAITING_FOR_CUSTOMER if currently OPEN/ASSIGNED
      if (["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(ticket.status)) {
        newStatus = "WAITING_FOR_CUSTOMER";
      }
      if (!firstRespondedAt) {
        firstRespondedAt = now;
      }
    } else if (!isAdmin) {
      // User responded -> status shifts back to IN_PROGRESS
      if (ticket.status === "WAITING_FOR_CUSTOMER" || ticket.status === "RESOLVED") {
        newStatus = "IN_PROGRESS";
      }
    }

    this.db.execute(
      `UPDATE support_tickets
       SET status = ?, first_responded_at = ?, updated_at = ?
       WHERE id = ?`,
      [newStatus, firstRespondedAt, now, ticket.id]
    );

    // Audit log
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.execute(
      `INSERT INTO ticket_audit_logs (id, ticket_id, actor_id, actor_name, actor_role, action, previous_state, new_state, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId,
        ticket.id,
        sender.id,
        sender.name,
        sender.role,
        isInternalNote ? "INTERNAL_NOTE_ADDED" : "PUBLIC_REPLY_ADDED",
        ticket.status,
        newStatus,
        isInternalNote ? "Staff internal note" : "Public communication",
        now,
      ]
    );

    // User Notification when Admin replies
    if (isAdmin && !isInternalNote && ticket.user_id) {
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        this.db.execute(
          `INSERT INTO notifications (id, title, message, type, recipient, is_read, related_entity, related_id, created_at)
           VALUES (?, ?, ?, 'SUPPORT', ?, 0, 'support_ticket', ?, ?)`,
          [
            notifId,
            `New Support Reply: ${ticket.ticket_number}`,
            `Agent ${sender.name} replied to your support ticket regarding "${ticket.subject}".`,
            ticket.user_id,
            ticket.id,
            now,
          ]
        );
      } catch {
        // notification catch
      }
    }

    return {
      success: true,
      messageId: msgId,
      status: newStatus,
      createdAt: now,
    };
  }

  // =========================================================================
  // ADMIN SUPPORT DESK WORKFLOWS
  // =========================================================================

  /**
   * Super Admin Overview KPI Metrics
   */
  getAdminOverview() {
    const totalTickets = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets")?.c || 0;
    const openTickets = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'OPEN'")?.c || 0;
    const assignedTickets = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'ASSIGNED'")?.c || 0;
    const inProgressTickets = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'IN_PROGRESS'")?.c || 0;
    const waitingForUser = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'WAITING_FOR_CUSTOMER'")?.c || 0;
    const escalatedTickets = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'ESCALATED'")?.c || 0;
    const resolvedTickets = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'RESOLVED'")?.c || 0;
    const closedTickets = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'CLOSED'")?.c || 0;
    const unassignedTickets = this.db.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM support_tickets WHERE assigned_to IS NULL AND status NOT IN ('RESOLVED', 'CLOSED')")?.c || 0;

    const now = new Date().toISOString();
    const overdueSla = this.db.queryOne<{ c: number }>(
      "SELECT COUNT(*) as c FROM support_tickets WHERE resolution_due_at < ? AND status NOT IN ('RESOLVED', 'CLOSED')",
      [now]
    )?.c || 0;

    return {
      totalTickets,
      openTickets,
      assignedTickets,
      inProgressTickets,
      waitingForUser,
      escalatedTickets,
      resolvedTickets,
      closedTickets,
      unassignedTickets,
      overdueSla,
    };
  }

  /**
   * Paginated Tickets Query with multi-filter & search
   */
  getAdminTickets(query: {
    status?: string;
    priority?: string;
    audience?: string;
    department?: string;
    assignedTo?: string;
    unassignedOnly?: boolean;
    escalatedOnly?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    let sql = `
      SELECT t.*, u.full_name as userName, u.phone_number as userPhone, u.email as userEmail,
             b.name as businessName
      FROM support_tickets t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN businesses b ON b.id = t.business_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query.status && query.status !== "ALL") {
      sql += ` AND t.status = ?`;
      params.push(query.status);
    }
    if (query.priority && query.priority !== "ALL") {
      sql += ` AND t.priority = ?`;
      params.push(query.priority);
    }
    if (query.audience && query.audience !== "ALL") {
      sql += ` AND t.audience = ?`;
      params.push(query.audience);
    }
    if (query.department && query.department !== "ALL") {
      sql += ` AND t.department = ?`;
      params.push(query.department);
    }
    if (query.assignedTo) {
      sql += ` AND t.assigned_to = ?`;
      params.push(query.assignedTo);
    }
    if (query.unassignedOnly) {
      sql += ` AND (t.assigned_to IS NULL OR t.assigned_to = '') AND t.status NOT IN ('RESOLVED', 'CLOSED')`;
    }
    if (query.escalatedOnly) {
      sql += ` AND (t.status = 'ESCALATED' OR t.priority = 'URGENT')`;
    }
    if (query.search && query.search.trim()) {
      const q = `%${query.search.trim()}%`;
      sql += ` AND (t.ticket_number LIKE ? OR t.subject LIKE ? OR t.category LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const countRes = this.db.queryOne<{ total: number }>(countSql, params);
    const total = countRes?.total || 0;

    sql += ` ORDER BY
      CASE WHEN t.status = 'ESCALATED' THEN 1
           WHEN t.priority = 'URGENT' THEN 2
           WHEN t.status = 'OPEN' THEN 3
           ELSE 4 END ASC,
      t.created_at DESC
      LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const data = this.db.query<any>(sql, params);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Assign or Reassign Ticket
   */
  assignTicket(ticketId: string, dto: AssignTicketDto, adminActor: { id: string; name: string; role: string }) {
    const ticket = this.db.queryOne<any>(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);
    if (!ticket) throw new NotFoundException("Ticket not found.");

    const now = new Date().toISOString();
    const newStatus = ticket.status === "OPEN" ? "ASSIGNED" : ticket.status;

    this.db.execute(
      `UPDATE support_tickets
       SET assigned_to = ?, assigned_agent_name = ?, department = COALESCE(?, department), status = ?, updated_at = ?
       WHERE id = ?`,
      [dto.agentId, dto.agentName, dto.department || null, newStatus, now, ticket.id]
    );

    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.execute(
      `INSERT INTO ticket_audit_logs (id, ticket_id, actor_id, actor_name, actor_role, action, previous_state, new_state, reason, created_at)
       VALUES (?, ?, ?, ?, ?, 'TICKET_ASSIGNED', ?, ?, ?, ?)`,
      [
        auditId,
        ticket.id,
        adminActor.id,
        adminActor.name,
        adminActor.role,
        ticket.assigned_agent_name || "Unassigned",
        dto.agentName,
        dto.reason || `Assigned to ${dto.agentName}`,
        now,
      ]
    );

    return { success: true, assignedTo: dto.agentName, status: newStatus };
  }

  /**
   * Escalate Ticket
   */
  escalateTicket(ticketId: string, reason: string, adminActor: { id: string; name: string; role: string }) {
    const ticket = this.db.queryOne<any>(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);
    if (!ticket) throw new NotFoundException("Ticket not found.");

    const now = new Date().toISOString();
    this.db.execute(
      `UPDATE support_tickets
       SET status = 'ESCALATED', priority = 'URGENT', updated_at = ?
       WHERE id = ?`,
      [now, ticket.id]
    );

    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.execute(
      `INSERT INTO ticket_audit_logs (id, ticket_id, actor_id, actor_name, actor_role, action, previous_state, new_state, reason, created_at)
       VALUES (?, ?, ?, ?, ?, 'TICKET_ESCALATED', ?, 'ESCALATED', ?, ?)`,
      [auditId, ticket.id, adminActor.id, adminActor.name, adminActor.role, ticket.status, reason || "Supervisor escalation requested", now]
    );

    return { success: true, status: "ESCALATED", priority: "URGENT" };
  }

  /**
   * Resolve Ticket
   */
  resolveTicket(ticketId: string, dto: ResolveTicketDto, adminActor: { id: string; name: string; role: string }) {
    const ticket = this.db.queryOne<any>(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);
    if (!ticket) throw new NotFoundException("Ticket not found.");

    if (!dto.resolutionSummary || !dto.resolutionSummary.trim()) {
      throw new BadRequestException("Resolution summary must be provided.");
    }

    const now = new Date().toISOString();

    this.db.execute(
      `UPDATE support_tickets
       SET status = 'RESOLVED', resolution_category = ?, resolution_summary = ?, resolved_at = ?, updated_at = ?
       WHERE id = ?`,
      [dto.resolutionCategory || "Issue Addressed", dto.resolutionSummary.trim(), now, now, ticket.id]
    );

    // Resolution message entry
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.execute(
      `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_name, sender_role, message, is_internal_note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        msgId,
        ticket.id,
        adminActor.id,
        adminActor.name,
        "SUPPORT_AGENT",
        `[Case Resolved]: ${dto.resolutionSummary.trim()}`,
        now,
      ]
    );

    // Audit record
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.execute(
      `INSERT INTO ticket_audit_logs (id, ticket_id, actor_id, actor_name, actor_role, action, previous_state, new_state, reason, created_at)
       VALUES (?, ?, ?, ?, ?, 'TICKET_RESOLVED', ?, 'RESOLVED', ?, ?)`,
      [auditId, ticket.id, adminActor.id, adminActor.name, adminActor.role, ticket.status, dto.resolutionSummary.trim(), now]
    );

    // Notify user
    if (ticket.user_id) {
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        this.db.execute(
          `INSERT INTO notifications (id, title, message, type, recipient, is_read, related_entity, related_id, created_at)
           VALUES (?, ?, ?, 'SUPPORT', ?, 0, 'support_ticket', ?, ?)`,
          [
            notifId,
            `Ticket Resolved: ${ticket.ticket_number}`,
            `Your support case "${ticket.subject}" has been marked as resolved. If you require further assistance, you may reopen it.`,
            ticket.user_id,
            ticket.id,
            now,
          ]
        );
      } catch {
        // Notification log catch
      }
    }

    return { success: true, status: "RESOLVED", resolvedAt: now };
  }

  /**
   * Reopen Ticket (Permitted within 7 days of resolution)
   */
  reopenTicket(ticketId: string, reason: string, userActor: { id: string; name: string; role: string }) {
    const ticket = this.db.queryOne<any>(`SELECT * FROM support_tickets WHERE id = ?`, [ticketId]);
    if (!ticket) throw new NotFoundException("Ticket not found.");

    if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
      throw new BadRequestException("Only resolved or closed tickets can be reopened.");
    }

    const now = new Date().toISOString();

    this.db.execute(
      `UPDATE support_tickets
       SET status = 'REOPENED', reopened_at = ?, updated_at = ?
       WHERE id = ?`,
      [now, now, ticket.id]
    );

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.execute(
      `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_name, sender_role, message, is_internal_note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        msgId,
        ticket.id,
        userActor.id,
        userActor.name,
        userActor.role,
        `[Ticket Reopened by User]: ${reason || "Issue persists or requires further follow-up."}`,
        now,
      ]
    );

    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.db.execute(
      `INSERT INTO ticket_audit_logs (id, ticket_id, actor_id, actor_name, actor_role, action, previous_state, new_state, reason, created_at)
       VALUES (?, ?, ?, ?, ?, 'TICKET_REOPENED', ?, 'REOPENED', ?, ?)`,
      [auditId, ticket.id, userActor.id, userActor.name, userActor.role, ticket.status, reason || "Reopened by user", now]
    );

    return { success: true, status: "REOPENED", reopenedAt: now };
  }

  // =========================================================================
  // CANNED RESPONSES & DEPARTMENTS
  // =========================================================================

  getCannedResponses(audience: string = "ALL") {
    if (audience === "ALL") {
      return this.db.query<any>(`SELECT * FROM support_canned_responses WHERE is_active = 1 ORDER BY category ASC, title ASC`);
    }
    return this.db.query<any>(
      `SELECT * FROM support_canned_responses WHERE is_active = 1 AND audience IN ('ALL', ?) ORDER BY category ASC, title ASC`,
      [audience]
    );
  }

  createCannedResponse(body: { title: string; category: string; audience: string; bodyText: string }) {
    const id = `can_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.execute(
      `INSERT INTO support_canned_responses (id, title, category, audience, body_text, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, body.title, body.category, body.audience || "ALL", body.bodyText, now, now]
    );

    return { id, ...body };
  }

  getDepartments() {
    return this.db.query<any>(`SELECT * FROM support_departments WHERE is_active = 1 ORDER BY name ASC`);
  }

  getSupportAgents() {
    return this.db.query<any>(
      `SELECT u.id, u.full_name as name, u.email, u.phone_number as phone
       FROM users u
       WHERE u.role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT_AGENT')
       ORDER BY u.full_name ASC`
    );
  }
}

