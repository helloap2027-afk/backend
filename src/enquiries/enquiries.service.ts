import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import * as crypto from "node:crypto";

export interface CreateEnquiryInput {
  businessId: string;
  customerName: string;
  customerPhone: string;
  message: string;
  priority?: "NORMAL" | "HIGH" | "URGENT";
  customerId?: string;
}

@Injectable()
export class EnquiriesService {
  constructor(private readonly db: DatabaseService) {}

  private normalizeIndianPhone(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+91") && cleaned.length === 13) {
      return cleaned;
    }
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith("91")) {
      return `+${digits}`;
    }
    throw new BadRequestException("Please enter a valid 10-digit Indian mobile number");
  }

  createEnquiry(input: CreateEnquiryInput) {
    if (!input.businessId) {
      throw new BadRequestException("Business ID is required");
    }
    if (!input.customerName || input.customerName.trim().length < 2) {
      throw new BadRequestException("Please enter your name");
    }
    if (!input.message || input.message.trim().length < 5) {
      throw new BadRequestException("Please enter enquiry details (at least 5 characters)");
    }

    const business = this.db.queryOne<any>(
      `SELECT id, name, primary_phone as primaryPhone, whatsapp_number as whatsappNumber FROM businesses WHERE id = ? AND status = 'APPROVED'`,
      [input.businessId]
    );

    if (!business) {
      throw new NotFoundException("Business not found or is currently inactive");
    }

    const normalizedPhone = this.normalizeIndianPhone(input.customerPhone);
    const now = new Date().toISOString();

    // Find or create customer
    let customerId = input.customerId;
    if (!customerId) {
      const existingUser = this.db.queryOne<any>(
        `SELECT id FROM users WHERE phone_number = ?`,
        [normalizedPhone]
      );
      if (existingUser) {
        customerId = existingUser.id;
      } else {
        customerId = `user-cust-${crypto.randomUUID().slice(0, 8)}`;
        this.db.execute(
          `INSERT INTO users (id, phone_number, full_name, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
          [customerId, normalizedPhone, input.customerName.trim(), now, now]
        );
        this.db.execute(
          `INSERT INTO user_permissions (id, user_id, role_id) VALUES (?, ?, 'role-cust')`,
          [`perm-${crypto.randomUUID().slice(0, 8)}`, customerId]
        );
      }
    }

    // Generate reference number
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const referenceNo = `ENQ-2026-${randomSuffix}`;
    const enquiryId = `enq-${crypto.randomUUID()}`;

    // Insert enquiry
    this.db.execute(
      `INSERT INTO enquiries (
        id, reference_no, business_id, customer_id, customer_name, customer_phone,
        message, status, priority, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?)`,
      [
        enquiryId,
        referenceNo,
        business.id,
        customerId,
        input.customerName.trim(),
        normalizedPhone,
        input.message.trim(),
        input.priority || "NORMAL",
        now,
        now,
      ]
    );

    // Insert initial lifecycle event
    this.db.execute(
      `INSERT INTO enquiry_events (
        id, enquiry_id, actor_user_id, previous_status, new_status, notes, created_at
      ) VALUES (?, ?, ?, NULL, 'NEW', 'Enquiry initiated via HELLO platform', ?)`,
      [`event-${crypto.randomUUID()}`, enquiryId, customerId, now]
    );

    // Update business statistics
    this.db.execute(
      `UPDATE businesses SET total_enquiries = total_enquiries + 1 WHERE id = ?`,
      [business.id]
    );

    return {
      id: enquiryId,
      referenceNo,
      businessId: business.id,
      businessName: business.name,
      businessPhone: business.primaryPhone,
      businessWhatsapp: business.whatsappNumber,
      customerName: input.customerName.trim(),
      customerPhone: normalizedPhone,
      message: input.message.trim(),
      status: "NEW",
      createdAt: now,
    };
  }

  getCustomerEnquiries(customerId: string) {
    const rows = this.db.query<any>(`
      SELECT 
        e.id, e.reference_no as referenceNo, e.message, e.status, e.priority,
        e.created_at as createdAt, e.updated_at as updatedAt,
        b.id as businessId, b.name as businessName, b.slug as businessSlug,
        b.primary_phone as businessPhone, b.whatsapp_number as businessWhatsapp,
        b.logo_url as businessLogo,
        c.name as cityName
      FROM enquiries e
      JOIN businesses b ON b.id = e.business_id
      JOIN business_locations bl ON bl.business_id = b.id AND bl.is_primary = 1
      JOIN cities c ON c.id = bl.city_id
      WHERE e.customer_id = ?
      ORDER BY e.created_at DESC
    `, [customerId]);

    return rows;
  }

  getEnquiryByReference(referenceNo: string) {
    const enquiry = this.db.queryOne<any>(`
      SELECT 
        e.id, e.reference_no as referenceNo, e.customer_name as customerName,
        e.customer_phone as customerPhone, e.message, e.status, e.priority,
        e.created_at as createdAt,
        b.id as businessId, b.name as businessName, b.slug as businessSlug,
        b.primary_phone as businessPhone, b.whatsapp_number as businessWhatsapp
      FROM enquiries e
      JOIN businesses b ON b.id = e.business_id
      WHERE e.reference_no = ?
    `, [referenceNo]);

    if (!enquiry) {
      throw new NotFoundException(`Enquiry reference '${referenceNo}' not found`);
    }

    const events = this.db.query<any>(`
      SELECT id, previous_status as previousStatus, new_status as newStatus, notes, created_at as createdAt
      FROM enquiry_events
      WHERE enquiry_id = ?
      ORDER BY created_at ASC
    `, [enquiry.id]);

    return {
      ...enquiry,
      timeline: events,
    };
  }
}

