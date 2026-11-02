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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnquiriesController = void 0;
const common_1 = require("@nestjs/common");
const enquiries_service_1 = require("./enquiries.service");
const auth_guard_1 = require("../auth/guards/auth.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const auth_service_1 = require("../auth/auth.service");
let EnquiriesController = class EnquiriesController {
    constructor(enquiriesService, authService) {
        this.enquiriesService = enquiriesService;
        this.authService = authService;
    }
    async createEnquiry(body, req) {
        let customerId;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const payload = this.authService.verifyAccessToken(token);
                customerId = payload.sub;
            }
            catch {
            }
        }
        const data = this.enquiriesService.createEnquiry({
            businessId: body.businessId,
            customerName: body.customerName,
            customerPhone: body.customerPhone,
            message: body.message,
            priority: body.priority,
            customerId,
        });
        return {
            success: true,
            data,
            message: "Enquiry submitted successfully! The business owner has been notified.",
        };
    }
    getMyEnquiries(user) {
        const data = this.enquiriesService.getCustomerEnquiries(user.sub);
        return {
            success: true,
            data,
            meta: {
                total: data.length,
            },
        };
    }
    getEnquiryByReference(referenceNo) {
        const data = this.enquiriesService.getEnquiryByReference(referenceNo);
        return {
            success: true,
            data,
        };
    }
};
exports.EnquiriesController = EnquiriesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EnquiriesController.prototype, "createEnquiry", null);
__decorate([
    (0, common_1.Get)("my"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnquiriesController.prototype, "getMyEnquiries", null);
__decorate([
    (0, common_1.Get)(":referenceNo"),
    __param(0, (0, common_1.Param)("referenceNo")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EnquiriesController.prototype, "getEnquiryByReference", null);
exports.EnquiriesController = EnquiriesController = __decorate([
    (0, common_1.Controller)("enquiries"),
    __metadata("design:paramtypes", [enquiries_service_1.EnquiriesService,
        auth_service_1.AuthService])
], EnquiriesController);
//# sourceMappingURL=enquiries.controller.js.map