"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnquiriesService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const crypto = require("node:crypto");
let EnquiriesService = class EnquiriesService {
    constructor(db) {
        this.db = db;
    }
    normalizeIndianPhone(phone) {
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
        throw new common_1.BadRequestException("Please enter a valid 10-digit Indian mobile number");
    }
    createEnquiry(input) {
        if (!input.businessId) {
            throw new common_1.BadRequestException("Business ID is required");
        }
        if (!input.customerName || input.customerName.trim().length < 2) {
            throw new common_1.BadRequestException("Please enter your name");
        }
        if (!input.message || input.message.trim().length < 5) {
            throw new common_1.BadRequestException("Please enter enquiry details (at least 5 characters)");
        }
        const business = this.db.queryOne(`SELECT id, name, primary_phone as primaryPhone, whatsapp_number as whatsappNumber FROM businesses WHERE id = ? AND status = 'APPROVED'`, [input.businessId]);
        if (!business) {
            throw new common_1.NotFoundException("Business not found or is currently inactive");
        }
        const normalizedPhone = this.normalizeIndianPhone(input.customerPhone);
        const now = new Date().toISOString();
        let customerId = input.customerId;
        if (!customerId) {
            const existingUser = this.db.queryOne(`SELECT id FROM users WHERE phone_number = ?`, [normalizedPhone]);
            if (existingUser) {
                customerId = existingUser.id;
            }
            else {
                customerId = `user-cust-${crypto.randomUUID().slice(0, 8)}`;
                this.db.execute(`INSERT INTO users (id, phone_number, full_name, status, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', ?, ?)`, [customerId, normalizedPhone, input.customerName.trim(), now, now]);
                this.db.execute(`INSERT INTO user_permissions (id, user_id, role_id) VALUES (?, ?, 'role-cust')`, [`perm-${crypto.randomUUID().slice(0, 8)}`, customerId]);
            }
        }
        const randomSuffix = Math.floor(10000 + Math.random() * 90000);
        const referenceNo = `ENQ-2026-${randomSuffix}`;
        const enquiryId = `enq-${crypto.randomUUID()}`;
        this.db.execute(`INSERT INTO enquiries (
        id, reference_no, business_id, customer_id, customer_name, customer_phone,
        message, status, priority, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?)`, [
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
        ]);
        this.db.execute(`INSERT INTO enquiry_events (
        id, enquiry_id, actor_user_id, previous_status, new_status, notes, created_at
      ) VALUES (?, ?, ?, NULL, 'NEW', 'Enquiry initiated via HELLO platform', ?)`, [`event-${crypto.randomUUID()}`, enquiryId, customerId, now]);
        this.db.execute(`UPDATE businesses SET total_enquiries = total_enquiries + 1 WHERE id = ?`, [business.id]);
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
    getCustomerEnquiries(customerId) {
        const rows = this.db.query(`
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
    getEnquiryByReference(referenceNo) {
        const enquiry = this.db.queryOne(`
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
            throw new common_1.NotFoundException(`Enquiry reference '${referenceNo}' not found`);
        }
        const events = this.db.query(`
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
};
exports.EnquiriesService = EnquiriesService;
exports.EnquiriesService = EnquiriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], EnquiriesService);
//# sourceMappingURL=enquiries.service.js.map