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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const auth_guard_1 = require("./guards/auth.guard");
const roles_decorator_1 = require("./decorators/roles.decorator");
class SendOtpDto {
}
class ResendOtpDto {
}
class VerifyOtpDto {
}
class RefreshTokenDto {
}
class SwitchRoleDto {
}
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async requestOtp(body) {
        const data = await this.authService.sendOtp(body.phoneNumber, body.purpose);
        return {
            success: true,
            data
        };
    }
    async sendOtp(body) {
        const data = await this.authService.sendOtp(body.phoneNumber, body.purpose);
        return {
            success: true,
            data
        };
    }
    async resendOtp(body) {
        const data = await this.authService.resendOtp(body.challengeId);
        return {
            success: true,
            data
        };
    }
    async verifyOtp(body, req) {
        const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
        const data = await this.authService.verifyOtp(body.challengeId, body.otp, body.deviceInfo, ip);
        return {
            success: true,
            data
        };
    }
    async refresh(body) {
        const data = await this.authService.rotateRefreshToken(body.refreshToken);
        return {
            success: true,
            data
        };
    }
    async refreshToken(body) {
        const data = await this.authService.rotateRefreshToken(body.refreshToken);
        return {
            success: true,
            data
        };
    }
    async logout(userId, body) {
        return this.authService.logout(userId, body.refreshToken);
    }
    async logoutAll(userId) {
        return this.authService.logoutAll(userId);
    }
    async getSessions(userId) {
        const data = this.authService.getUserSessions(userId);
        return {
            success: true,
            data
        };
    }
    async revokeSession(userId, sessionId) {
        return this.authService.revokeSession(userId, sessionId);
    }
    async switchRole(userId, body) {
        const data = await this.authService.switchRole(userId, body.targetRole);
        return {
            success: true,
            data
        };
    }
    async getMe(userId) {
        const data = this.authService.getUserProfile(userId);
        return {
            success: true,
            data
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)("otp/request"),
    (0, swagger_1.ApiOperation)({ summary: "Request 6-digit SMS OTP" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "OTP challenge created" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestOtp", null);
__decorate([
    (0, common_1.Post)("otp/send"),
    (0, swagger_1.ApiOperation)({ summary: "Dispatch 6-digit SMS OTP with sliding-window rate limit" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "OTP challenge created" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)("otp/resend"),
    (0, swagger_1.ApiOperation)({ summary: "Resend 6-digit SMS OTP adhering to mandatory cooldown" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "New OTP dispatched" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ResendOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendOtp", null);
__decorate([
    (0, common_1.Post)("otp/verify"),
    (0, swagger_1.ApiOperation)({ summary: "Verify 6-digit OTP and generate JWT access + refresh tokens" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: "Authenticated successfully" }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyOtpDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)("refresh"),
    (0, swagger_1.ApiOperation)({ summary: "Rotate refresh token and issue new JWT access token" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)("token/refresh"),
    (0, swagger_1.ApiOperation)({ summary: "Rotate refresh token and issue new JWT access token (alias)" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)("logout"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Revoke current user session and logout" }),
    __param(0, (0, roles_decorator_1.CurrentUser)("sub")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)("logout-all"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Revoke all active sessions across all devices" }),
    __param(0, (0, roles_decorator_1.CurrentUser)("sub")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Get)("sessions"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Get all active sessions for current user" }),
    __param(0, (0, roles_decorator_1.CurrentUser)("sub")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Delete)("sessions/:id"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Revoke a specific active session" }),
    __param(0, (0, roles_decorator_1.CurrentUser)("sub")),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "revokeSession", null);
__decorate([
    (0, common_1.Post)("switch-role"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Switch active role between Customer and Vendor" }),
    __param(0, (0, roles_decorator_1.CurrentUser)("sub")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SwitchRoleDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "switchRole", null);
__decorate([
    (0, common_1.Get)("me"),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Fetch current authenticated user profile, roles & owned businesses" }),
    __param(0, (0, roles_decorator_1.CurrentUser)("sub")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)("Authentication"),
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map