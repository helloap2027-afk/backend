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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const auth_guard_1 = require("../auth/guards/auth.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    getProfile(user) {
        const profile = this.usersService.getProfile(user.sub);
        return {
            success: true,
            data: profile,
        };
    }
    updateProfile(user, body) {
        const profile = this.usersService.updateProfile(user.sub, body);
        return {
            success: true,
            data: profile,
            message: "Profile updated successfully.",
        };
    }
    switchMode(user, body) {
        const result = this.usersService.evaluateModeSwitch(user.sub, body.targetMode || "customer");
        return result;
    }
    toggleSavedBusiness(user, businessId) {
        const data = this.usersService.toggleSavedBusiness(user.sub, businessId);
        return {
            success: true,
            data,
        };
    }
    getSavedBusinesses(user) {
        const data = this.usersService.getSavedBusinesses(user.sub);
        return {
            success: true,
            data,
            meta: {
                total: data.length,
            },
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)("me"),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)("me"),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)("mode/switch"),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "switchMode", null);
__decorate([
    (0, common_1.Post)("saved-businesses/:businessId"),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("businessId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "toggleSavedBusiness", null);
__decorate([
    (0, common_1.Get)("saved-businesses"),
    __param(0, (0, roles_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "getSavedBusinesses", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)("users"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map