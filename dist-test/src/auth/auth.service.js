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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const validation_1 = require("@hello/validation");
const config_1 = require("@hello/config");
const crypto = require("node:crypto");
let AuthService = class AuthService {
    constructor(db) {
        this.db = db;
        this.jwtSecret = process.env.JWT_SECRET || "hello_production_super_secret_jwt_key_2026";
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || "hello_production_refresh_token_secret_2026";
    }
    async sendOtp(rawPhone, purpose = "LOGIN") {
        if (!(0, validation_1.isValidIndianPhone)(rawPhone)) {
            throw new common_1.BadRequestException("Phone number must be a valid Indian mobile number (+91XXXXXXXXXX)");
        }
        const phone = (0, validation_1.normalizeIndianPhone)(rawPhone);
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
        const recentChallenges = this.db.query("SELECT created_at FROM otp_challenges WHERE phone_number = ? AND created_at >= ? ORDER BY created_at DESC", [phone, fifteenMinutesAgo]);
        if (recentChallenges.length >= config_1.APP_CONFIG.rateLimits.otpSend.maxRequests) {
            throw new common_1.BadRequestException(`Rate limit exceeded. Maximum ${config_1.APP_CONFIG.rateLimits.otpSend.maxRequests} OTPs per 15 minutes. Please try again later.`);
        }
        if (recentChallenges.length > 0) {
            const lastSentTime = new Date(recentChallenges[0].created_at).getTime();
            const elapsedSeconds = Math.floor((now.getTime() - lastSentTime) / 1000);
            if (elapsedSeconds < config_1.APP_CONFIG.auth.otpCooldownSeconds) {
                const remaining = config_1.APP_CONFIG.auth.otpCooldownSeconds - elapsedSeconds;
                throw new common_1.BadRequestException(`Please wait ${remaining} seconds before requesting a new OTP.`);
            }
        }
        const rawOtp = crypto.randomInt(100000, 999999).toString();
        const otpHash = this.hashString(rawOtp);
        const challengeId = `chl_${crypto.randomUUID()}`;
        const expiresAt = new Date(now.getTime() + config_1.APP_CONFIG.auth.otpTtlSeconds * 1000).toISOString();
        this.db.execute(`INSERT INTO otp_challenges (id, phone_number, otp_code_hash, attempts_count, purpose, expires_at, created_at)
       VALUES (?, ?, ?, 0, ?, ?, ?)`, [challengeId, phone, otpHash, purpose, expiresAt, now.toISOString()]);
        if (process.env.NODE_ENV !== "production") {
            console.log(`[SMS GATEWAY SIMULATION] To: ${phone} | Your HELLO verification code is: ${rawOtp} (Valid 5 mins)`);
        }
        const maskedPhone = phone.slice(0, 3) + " " + phone.slice(3, 8) + " •••••";
        return {
            challengeId,
            expiresInSeconds: config_1.APP_CONFIG.auth.otpTtlSeconds,
            resendCooldownSeconds: config_1.APP_CONFIG.auth.otpCooldownSeconds,
            maskedPhone,
            ...(process.env.NODE_ENV !== "production" ? { devOtp: rawOtp } : {})
        };
    }
    async verifyOtp(challengeId, otp, deviceInfo = "Browser / App", ipAddress = "127.0.0.1") {
        if (!(0, validation_1.isValidOtp)(otp)) {
            throw new common_1.BadRequestException("OTP must be exactly 6 numeric digits.");
        }
        const challenge = this.db.queryOne("SELECT * FROM otp_challenges WHERE id = ?", [challengeId]);
        if (!challenge) {
            throw new common_1.BadRequestException("Invalid or expired OTP challenge reference.");
        }
        if (challenge.verified_at) {
            throw new common_1.BadRequestException("This OTP has already been verified.");
        }
        const now = new Date();
        if (new Date(challenge.expires_at) < now) {
            throw new common_1.BadRequestException("OTP has expired. Please request a new verification code.");
        }
        if (challenge.attempts_count >= config_1.APP_CONFIG.auth.maxOtpAttempts) {
            throw new common_1.ForbiddenException("Maximum OTP verification attempts exceeded. Challenge locked.");
        }
        const inputHash = this.hashString(otp);
        if (inputHash !== challenge.otp_code_hash) {
            this.db.execute("UPDATE otp_challenges SET attempts_count = attempts_count + 1 WHERE id = ?", [challengeId]);
            const remaining = config_1.APP_CONFIG.auth.maxOtpAttempts - (challenge.attempts_count + 1);
            throw new common_1.UnauthorizedException(`Incorrect OTP code. ${remaining} attempts remaining.`);
        }
        this.db.execute("UPDATE otp_challenges SET verified_at = ? WHERE id = ?", [now.toISOString(), challengeId]);
        let user = this.db.queryOne("SELECT * FROM users WHERE phone_number = ?", [challenge.phone_number]);
        const isNewUser = !user;
        if (!user) {
            const userId = `usr_${crypto.randomUUID()}`;
            this.db.execute(`INSERT INTO users (id, phone_number, status, phone_verified_at, created_at, updated_at)
         VALUES (?, ?, 'ACTIVE', ?, ?, ?)`, [userId, challenge.phone_number, now.toISOString(), now.toISOString(), now.toISOString()]);
            const customerRole = this.db.queryOne("SELECT id FROM roles WHERE name = 'CUSTOMER'");
            if (customerRole) {
                this.db.execute(`INSERT INTO user_permissions (id, user_id, role_id) VALUES (?, ?, ?)`, [`perm_${crypto.randomUUID()}`, userId, customerRole.id]);
            }
            user = this.db.queryOne("SELECT * FROM users WHERE id = ?", [userId]);
        }
        else {
            this.db.execute("UPDATE users SET phone_verified_at = ?, updated_at = ? WHERE id = ?", [now.toISOString(), now.toISOString(), user.id]);
        }
        const userRoles = this.getUserRoles(user.id);
        const ownedBusinesses = this.getUserBusinesses(user.id);
        if (ownedBusinesses.length > 0 && !userRoles.includes("VENDOR_OWNER")) {
            const vendorRole = this.db.queryOne("SELECT id FROM roles WHERE name = 'VENDOR_OWNER'");
            if (vendorRole) {
                this.db.execute(`INSERT OR IGNORE INTO user_permissions (id, user_id, role_id) VALUES (?, ?, ?)`, [`perm_${crypto.randomUUID()}`, user.id, vendorRole.id]);
                userRoles.push("VENDOR_OWNER");
            }
        }
        const sessionId = `sess_${crypto.randomUUID()}`;
        const rawRefreshToken = `rft_${crypto.randomBytes(32).toString("hex")}`;
        const refreshTokenHash = this.hashString(rawRefreshToken);
        const sessionExpiresAt = new Date(now.getTime() + config_1.APP_CONFIG.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000).toISOString();
        this.db.execute(`INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [sessionId, user.id, refreshTokenHash, deviceInfo, ipAddress, sessionExpiresAt, now.toISOString()]);
        const accessToken = this.signJwt({
            sub: user.id,
            phone: user.phone_number,
            roles: userRoles,
            iat: Math.floor(now.getTime() / 1000),
            exp: Math.floor(now.getTime() / 1000) + config_1.APP_CONFIG.auth.accessTokenTtlMinutes * 60
        });
        return {
            accessToken,
            refreshToken: rawRefreshToken,
            tokenType: "Bearer",
            expiresIn: config_1.APP_CONFIG.auth.accessTokenTtlMinutes * 60,
            user: {
                id: user.id,
                phoneNumber: user.phone_number,
                fullName: user.full_name || undefined,
                email: user.email || undefined,
                status: user.status,
                roles: userRoles,
                ownedBusinesses,
                isNewUser
            }
        };
    }
    async rotateRefreshToken(rawRefreshToken) {
        if (!rawRefreshToken || !rawRefreshToken.startsWith("rft_")) {
            throw new common_1.UnauthorizedException("Invalid refresh token structure.");
        }
        const tokenHash = this.hashString(rawRefreshToken);
        const session = this.db.queryOne("SELECT * FROM user_sessions WHERE refresh_token_hash = ?", [tokenHash]);
        if (!session) {
            throw new common_1.UnauthorizedException("Session not found or token invalid.");
        }
        const now = new Date();
        if (session.revoked_at) {
            this.db.execute("UPDATE user_sessions SET revoked_at = ? WHERE user_id = ?", [now.toISOString(), session.user_id]);
            throw new common_1.UnauthorizedException("Compromised session detected. All sessions terminated.");
        }
        if (new Date(session.expires_at) < now) {
            throw new common_1.UnauthorizedException("Refresh token session expired. Please log in again.");
        }
        this.db.execute("UPDATE user_sessions SET revoked_at = ? WHERE id = ?", [now.toISOString(), session.id]);
        const newSessionId = `sess_${crypto.randomUUID()}`;
        const newRawRefreshToken = `rft_${crypto.randomBytes(32).toString("hex")}`;
        const newRefreshTokenHash = this.hashString(newRawRefreshToken);
        const sessionExpiresAt = new Date(now.getTime() + config_1.APP_CONFIG.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000).toISOString();
        this.db.execute(`INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [newSessionId, session.user_id, newRefreshTokenHash, session.device_info, session.ip_address, sessionExpiresAt, now.toISOString()]);
        const user = this.db.queryOne("SELECT * FROM users WHERE id = ?", [session.user_id]);
        const userRoles = this.getUserRoles(user.id);
        const newAccessToken = this.signJwt({
            sub: user.id,
            phone: user.phone_number,
            roles: userRoles,
            iat: Math.floor(now.getTime() / 1000),
            exp: Math.floor(now.getTime() / 1000) + config_1.APP_CONFIG.auth.accessTokenTtlMinutes * 60
        });
        return {
            accessToken: newAccessToken,
            refreshToken: newRawRefreshToken,
            expiresIn: config_1.APP_CONFIG.auth.accessTokenTtlMinutes * 60
        };
    }
    async logout(userId, rawRefreshToken) {
        const now = new Date().toISOString();
        if (rawRefreshToken) {
            const hash = this.hashString(rawRefreshToken);
            this.db.execute("UPDATE user_sessions SET revoked_at = ? WHERE refresh_token_hash = ?", [now, hash]);
        }
        else {
            this.db.execute("UPDATE user_sessions SET revoked_at = ? WHERE user_id = ?", [now, userId]);
        }
        return { success: true, message: "Logged out successfully" };
    }
    validateUserToken(token) {
        try {
            const payload = this.verifyJwt(token);
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                throw new common_1.UnauthorizedException("Access token expired");
            }
            return payload;
        }
        catch {
            throw new common_1.UnauthorizedException("Invalid access token");
        }
    }
    getUserProfile(userId) {
        const user = this.db.queryOne("SELECT * FROM users WHERE id = ?", [userId]);
        if (!user)
            throw new common_1.UnauthorizedException("User not found.");
        return {
            id: user.id,
            phoneNumber: user.phone_number,
            fullName: user.full_name,
            email: user.email,
            avatarUrl: user.avatar_url,
            status: user.status,
            roles: this.getUserRoles(user.id),
            ownedBusinesses: this.getUserBusinesses(user.id)
        };
    }
    getUserRoles(userId) {
        const rows = this.db.query(`SELECT r.name FROM user_permissions up
       JOIN roles r ON up.role_id = r.id
       WHERE up.user_id = ?`, [userId]);
        return rows.map((r) => r.name);
    }
    getUserBusinesses(userId) {
        return this.db.query(`SELECT b.id, b.name, b.slug, b.is_verified, b.status, bo.ownership_type
       FROM business_owners bo
       JOIN businesses b ON bo.business_id = b.id
       WHERE bo.user_id = ?`, [userId]);
    }
    hashString(input) {
        return crypto.createHash("sha256").update(input).digest("hex");
    }
    signJwt(payload) {
        const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
        const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
        const signature = crypto
            .createHmac("sha256", this.jwtSecret)
            .update(`${header}.${body}`)
            .digest("base64url");
        return `${header}.${body}.${signature}`;
    }
    verifyAccessToken(token) {
        return this.verifyJwt(token);
    }
    verifyJwt(token) {
        const parts = token.split(".");
        if (parts.length !== 3)
            throw new Error("Invalid JWT structure");
        const [header, body, signature] = parts;
        const expectedSig = crypto
            .createHmac("sha256", this.jwtSecret)
            .update(`${header}.${body}`)
            .digest("base64url");
        if (signature !== expectedSig) {
            throw new Error("Invalid signature");
        }
        return JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuthService);
//# sourceMappingURL=auth.service.js.map