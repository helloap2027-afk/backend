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
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../database/database.service");
let TenantGuard = class TenantGuard {
    constructor(db) {
        this.db = db;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const businessId = request.params.businessId ||
            request.params.id ||
            request.headers["x-business-id"] ||
            request.body?.businessId;
        if (!businessId) {
            throw new common_1.BadRequestException("Missing target business context identifier.");
        }
        if (user.roles?.includes("SUPER_ADMIN")) {
            return true;
        }
        const membership = this.db.queryOne(`SELECT id FROM business_owners WHERE business_id = ? AND user_id = ?
       UNION
       SELECT id FROM business_staff WHERE business_id = ? AND user_id = ? AND status = 'ACTIVE'`, [businessId, user.sub, businessId, user.sub]);
        if (!membership) {
            throw new common_1.ForbiddenException("Access denied: You do not possess management privileges for this business entity.");
        }
        request.tenant = { businessId };
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map