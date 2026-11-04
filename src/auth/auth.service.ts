import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { isValidIndianPhone, normalizeIndianPhone, isValidOtp, APP_CONFIG } from "../common/utils";

import * as crypto from "node:crypto";

export interface TokenPayload {
  sub: string;
  phone: string;
  roles: string[];
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;

  constructor(private readonly db: DatabaseService) {
    this.jwtSecret = process.env.JWT_SECRET || "hello_production_super_secret_jwt_key_2026";
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || "hello_production_refresh_token_secret_2026";
  }

  /**
   * 1. Send SMS OTP with sliding-window rate limiting & brute-force prevention
   */
  async sendOtp(rawPhone: string, purpose = "LOGIN", role?: string) {
    if (!isValidIndianPhone(rawPhone)) {
      throw new BadRequestException("Phone number must be a valid Indian mobile number (+91XXXXXXXXXX)");
    }

    const phone = normalizeIndianPhone(rawPhone);
    const existingUser = this.db.queryOne<any>("SELECT * FROM users WHERE phone_number = ?", [phone]);

    // ─── INDUSTRY-STANDARD STRICT ROLE & REGISTRATION PRE-CHECKS ─────────────
    if (purpose === "REGISTRATION") {
      if (existingUser) {
        const roles = this.getUserRoles(existingUser.id);
        const businesses = this.getUserBusinesses(existingUser.id);
        const hasCustomerRole = roles.includes("CUSTOMER");
        const hasPartnerRole = roles.includes("VENDOR_OWNER") || roles.includes("VENDOR_STAFF") || businesses.length > 0;

        if (role === "PARTNER" || role === "VENDOR_OWNER") {
          if (hasPartnerRole) {
            throw new BadRequestException(
              `Already this account was registered with Business Partner role. Please switch to Sign In.`
            );
          }
        } else {
          // Default Customer Registration
          if (hasCustomerRole) {
            throw new BadRequestException(
              `Already this account was registered with Customer role. Please switch to Sign In.`
            );
          }
        }
      }
    } else if (purpose === "LOGIN") {
      if (!existingUser) {
        throw new BadRequestException(
          `No registered account found for this mobile number. First you register the account before logging in.`
        );
      }
      const roles = this.getUserRoles(existingUser.id);
      const businesses = this.getUserBusinesses(existingUser.id);
      const hasCustomerRole = roles.includes("CUSTOMER");
      const hasPartnerRole = roles.includes("VENDOR_OWNER") || roles.includes("VENDOR_STAFF") || businesses.length > 0;

      if (role === "PARTNER" || role === "VENDOR_OWNER") {
        if (!hasPartnerRole) {
          throw new BadRequestException(
            `This mobile number is registered as a Customer, not a Business Partner. First you register the Business Partner account.`
          );
        }
      } else if (role === "CUSTOMER") {
        if (!hasCustomerRole) {
          throw new BadRequestException(
            `This mobile number is not registered as a Customer. First you register the Customer account.`
          );
        }
      }
    }

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

    // Check sliding window rate limit: max 3 OTP requests in last 15 minutes
    const recentChallenges = this.db.query<{ created_at: string }>(
      "SELECT created_at FROM otp_challenges WHERE phone_number = ? AND created_at >= ? ORDER BY created_at DESC",
      [phone, fifteenMinutesAgo]
    );

    if (recentChallenges.length >= APP_CONFIG.rateLimits.otpSend.maxRequests) {
      throw new BadRequestException(
        `Rate limit exceeded. Maximum ${APP_CONFIG.rateLimits.otpSend.maxRequests} OTPs per 15 minutes. Please try again later.`
      );
    }

    // Check mandatory cooldown: 45 seconds between consecutive requests
    if (recentChallenges.length > 0) {
      const lastSentTime = new Date(recentChallenges[0].created_at).getTime();
      const elapsedSeconds = Math.floor((now.getTime() - lastSentTime) / 1000);
      if (elapsedSeconds < APP_CONFIG.auth.otpCooldownSeconds) {
        const remaining = APP_CONFIG.auth.otpCooldownSeconds - elapsedSeconds;
        throw new BadRequestException(`Please wait ${remaining} seconds before requesting a new OTP.`);
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashString(rawOtp);
    const challengeId = `chl_${crypto.randomUUID()}`;
    const expiresAt = new Date(now.getTime() + APP_CONFIG.auth.otpTtlSeconds * 1000).toISOString();

    // Store in SQL database
    this.db.execute(
      `INSERT INTO otp_challenges (id, phone_number, otp_code_hash, attempts_count, purpose, role, expires_at, created_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
      [challengeId, phone, otpHash, purpose, (role || "CUSTOMER").toUpperCase(), expiresAt, now.toISOString()]
    );

    // In development / demo environment, log securely for local testing
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SMS GATEWAY SIMULATION] To: ${phone} | Your HELLO verification code is: ${rawOtp} (Valid 5 mins)`);
    }

    const maskedPhone = phone.slice(0, 3) + " " + phone.slice(3, 8) + " •••••";

    return {
      challengeId,
      expiresInSeconds: APP_CONFIG.auth.otpTtlSeconds,
      resendCooldownSeconds: APP_CONFIG.auth.otpCooldownSeconds,
      maskedPhone,
      // Pass devOtp only in test/dev for automated integration testing
      ...(process.env.NODE_ENV !== "production" ? { devOtp: rawOtp } : {})
    };
  }

  /**
   * 2. Verify OTP, generate session, and return tokens + unified user profile
   */
  async verifyOtp(challengeId: string, otp: string, deviceInfo = "Browser / App", ipAddress = "127.0.0.1") {
    if (!isValidOtp(otp)) {
      throw new BadRequestException("OTP must be exactly 6 numeric digits.");
    }

    const challenge = this.db.queryOne<any>(
      "SELECT * FROM otp_challenges WHERE id = ?",
      [challengeId]
    );

    if (!challenge) {
      throw new BadRequestException("Invalid or expired OTP challenge reference.");
    }

    if (challenge.verified_at) {
      throw new BadRequestException("This OTP has already been verified.");
    }

    const now = new Date();
    if (new Date(challenge.expires_at) < now) {
      throw new BadRequestException("OTP has expired. Please request a new verification code.");
    }

    if (challenge.attempts_count >= APP_CONFIG.auth.maxOtpAttempts) {
      throw new ForbiddenException("Maximum OTP verification attempts exceeded. Challenge locked.");
    }

    // Verify hash
    const inputHash = this.hashString(otp);
    if (inputHash !== challenge.otp_code_hash) {
      // Increment attempt counter in SQL
      this.db.execute(
        "UPDATE otp_challenges SET attempts_count = attempts_count + 1 WHERE id = ?",
        [challengeId]
      );
      const remaining = APP_CONFIG.auth.maxOtpAttempts - (challenge.attempts_count + 1);
      throw new UnauthorizedException(`Incorrect OTP code. ${remaining} attempts remaining.`);
    }

    // Mark challenge verified
    this.db.execute(
      "UPDATE otp_challenges SET verified_at = ? WHERE id = ?",
      [now.toISOString(), challengeId]
    );

    // Find or Create User
    let user = this.db.queryOne<any>("SELECT * FROM users WHERE phone_number = ?", [challenge.phone_number]);
    const isNewUser = !user;

    if (!user) {
      const userId = `usr_${crypto.randomUUID()}`;
      this.db.execute(
        `INSERT INTO users (id, phone_number, status, phone_verified_at, created_at, updated_at)
         VALUES (?, ?, 'ACTIVE', ?, ?, ?)`,
        [userId, challenge.phone_number, now.toISOString(), now.toISOString(), now.toISOString()]
      );

      // Check if registration was for Partner or Customer
      const isPartnerChallenge = challenge.role === "PARTNER" || challenge.role === "VENDOR_OWNER";
      const targetRoleName = isPartnerChallenge ? "VENDOR_OWNER" : "CUSTOMER";
      const targetRole = this.db.queryOne<any>("SELECT id FROM roles WHERE name = ?", [targetRoleName]);
      if (targetRole) {
        this.db.execute(
          `INSERT INTO user_permissions (id, user_id, role_id) VALUES (?, ?, ?)`,
          [`perm_${crypto.randomUUID()}`, userId, targetRole.id]
        );
      }

      user = this.db.queryOne<any>("SELECT * FROM users WHERE id = ?", [userId]);
    } else {
      // Update phone verification timestamp
      this.db.execute(
        "UPDATE users SET phone_verified_at = ?, updated_at = ? WHERE id = ?",
        [now.toISOString(), now.toISOString(), user.id]
      );

      // If existing user verified a PARTNER challenge, ensure VENDOR_OWNER role is granted
      const isPartnerChallenge = challenge.role === "PARTNER" || challenge.role === "VENDOR_OWNER";
      if (isPartnerChallenge) {
        const vendorRole = this.db.queryOne<any>("SELECT id FROM roles WHERE name = 'VENDOR_OWNER'");
        if (vendorRole) {
          const hasVendorPerm = this.db.queryOne<any>(
            "SELECT id FROM user_permissions WHERE user_id = ? AND role_id = ?",
            [user.id, vendorRole.id]
          );
          if (!hasVendorPerm) {
            this.db.execute(
              `INSERT INTO user_permissions (id, user_id, role_id) VALUES (?, ?, ?)`,
              [`perm_${crypto.randomUUID()}`, user.id, vendorRole.id]
            );
          }
        }
      }
    }

    // Fetch User Roles & Business Memberships
    const userRoles = this.getUserRoles(user.id);
    const ownedBusinesses = this.getUserBusinesses(user.id);

    // If user owns approved businesses, ensure VENDOR_OWNER role is assigned
    if (ownedBusinesses.length > 0 && !userRoles.includes("VENDOR_OWNER")) {
      const vendorRole = this.db.queryOne<any>("SELECT id FROM roles WHERE name = 'VENDOR_OWNER'");
      if (vendorRole) {
        this.db.execute(
          `INSERT OR IGNORE INTO user_permissions (id, user_id, role_id) VALUES (?, ?, ?)`,
          [`perm_${crypto.randomUUID()}`, user.id, vendorRole.id]
        );
        userRoles.push("VENDOR_OWNER");
      }
    }

    // Create session & tokens
    const sessionId = `sess_${crypto.randomUUID()}`;
    const rawRefreshToken = `rft_${crypto.randomBytes(32).toString("hex")}`;
    const refreshTokenHash = this.hashString(rawRefreshToken);
    const sessionExpiresAt = new Date(now.getTime() + APP_CONFIG.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000).toISOString();

    this.db.execute(
      `INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, user.id, refreshTokenHash, deviceInfo, ipAddress, sessionExpiresAt, now.toISOString()]
    );

    const accessToken = this.signJwt({
      sub: user.id,
      phone: user.phone_number,
      roles: userRoles,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(now.getTime() / 1000) + APP_CONFIG.auth.accessTokenTtlMinutes * 60
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: "Bearer" as const,
      expiresIn: APP_CONFIG.auth.accessTokenTtlMinutes * 60,
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

  /**
   * 3. Refresh Token Rotation (Single-Use with Reuse Detection)
   */
  async rotateRefreshToken(rawRefreshToken: string) {
    if (!rawRefreshToken || !rawRefreshToken.startsWith("rft_")) {
      throw new UnauthorizedException("Invalid refresh token structure.");
    }

    const tokenHash = this.hashString(rawRefreshToken);
    const session = this.db.queryOne<any>(
      "SELECT * FROM user_sessions WHERE refresh_token_hash = ?",
      [tokenHash]
    );

    if (!session) {
      throw new UnauthorizedException("Session not found or token invalid.");
    }

    const now = new Date();

    // Reuse detection: If token is already revoked, invalidate all sessions for security
    if (session.revoked_at) {
      this.db.execute(
        "UPDATE user_sessions SET revoked_at = ? WHERE user_id = ?",
        [now.toISOString(), session.user_id]
      );
      throw new UnauthorizedException("Compromised session detected. All sessions terminated.");
    }

    if (new Date(session.expires_at) < now) {
      throw new UnauthorizedException("Refresh token session expired. Please log in again.");
    }

    // Invalidate current token (Single-use rotation)
    this.db.execute(
      "UPDATE user_sessions SET revoked_at = ? WHERE id = ?",
      [now.toISOString(), session.id]
    );

    // Issue new session
    const newSessionId = `sess_${crypto.randomUUID()}`;
    const newRawRefreshToken = `rft_${crypto.randomBytes(32).toString("hex")}`;
    const newRefreshTokenHash = this.hashString(newRawRefreshToken);
    const sessionExpiresAt = new Date(now.getTime() + APP_CONFIG.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000).toISOString();

    this.db.execute(
      `INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newSessionId, session.user_id, newRefreshTokenHash, session.device_info, session.ip_address, sessionExpiresAt, now.toISOString()]
    );

    const user = this.db.queryOne<any>("SELECT * FROM users WHERE id = ?", [session.user_id]);
    const userRoles = this.getUserRoles(user.id);

    const newAccessToken = this.signJwt({
      sub: user.id,
      phone: user.phone_number,
      roles: userRoles,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(now.getTime() / 1000) + APP_CONFIG.auth.accessTokenTtlMinutes * 60
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: APP_CONFIG.auth.accessTokenTtlMinutes * 60
    };
  }

  /**
   * 4. Logout / Session Revocation
   */
  async logout(userId: string, rawRefreshToken?: string) {
    const now = new Date().toISOString();
    if (rawRefreshToken) {
      const hash = this.hashString(rawRefreshToken);
      this.db.execute("UPDATE user_sessions SET revoked_at = ? WHERE refresh_token_hash = ?", [now, hash]);
    } else {
      // Revoke all sessions for user
      this.db.execute("UPDATE user_sessions SET revoked_at = ? WHERE user_id = ?", [now, userId]);
    }
    return { success: true, message: "Logged out successfully" };
  }

  /**
   * 5. Token Verification & Authentication Context
   */
  validateUserToken(token: string): TokenPayload {
    try {
      const payload = this.verifyJwt(token);
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new UnauthorizedException("Access token expired");
      }
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }

  getUserProfile(userId: string) {
    const user = this.db.queryOne<any>(`
      SELECT 
        u.id,
        u.phone_number,
        u.full_name,
        u.email,
        u.avatar_url,
        u.preferred_language,
        u.locality_id,
        u.status,
        u.phone_verified_at,
        u.created_at,
        u.updated_at,
        loc.name as locality_name,
        c.id as city_id,
        c.name as city_name,
        s.id as state_id,
        s.name as state_name
      FROM users u
      LEFT JOIN localities loc ON loc.id = u.locality_id
      LEFT JOIN cities c ON c.id = loc.city_id
      LEFT JOIN districts d ON d.id = c.district_id
      LEFT JOIN states s ON s.id = d.state_id
      WHERE u.id = ?
    `, [userId]);

    if (!user) throw new UnauthorizedException("User not found.");

    const roles = this.getUserRoles(userId);
    const businesses = this.getUserBusinesses(userId);

    return {
      id: user.id,
      phoneNumber: user.phone_number,
      fullName: user.full_name,
      email: user.email,
      avatarUrl: user.avatar_url,
      preferredLanguage: user.preferred_language || "English",
      status: user.status,
      phoneVerifiedAt: user.phone_verified_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      locality: user.locality_name ? {
        id: user.locality_id,
        name: user.locality_name,
        cityName: user.city_name,
        stateName: user.state_name
      } : null,
      roles,
      businesses,
      ownedBusinesses: businesses
    };
  }

  public getUserRoles(userId: string): string[] {
    const rows = this.db.query<{ name: string }>(
      `SELECT r.name FROM user_permissions up
       JOIN roles r ON up.role_id = r.id
       WHERE up.user_id = ?`,
      [userId]
    );
    return rows.map((r) => r.name);
  }

  public getUserBusinesses(userId: string) {
    return this.db.query<any>(
      `SELECT b.id, b.name, b.slug, b.is_verified, b.status, bo.ownership_type
       FROM business_owners bo
       JOIN businesses b ON bo.business_id = b.id
       WHERE bo.user_id = ?`,
      [userId]
    );
  }

  /**
<<<<<<< HEAD
=======
   * Check user registration and role status before OTP dispatch
   */
  async checkUserStatus(rawPhone: string) {
    if (!isValidIndianPhone(rawPhone)) {
      throw new BadRequestException("Phone number must be a valid Indian mobile number (+91XXXXXXXXXX)");
    }
    const phone = normalizeIndianPhone(rawPhone);
    const user = this.db.queryOne<any>("SELECT * FROM users WHERE phone_number = ?", [phone]);

    if (!user) {
      return {
        exists: false,
        phone,
        hasCustomerRole: false,
        hasPartnerRole: false,
        businessCount: 0,
        businesses: [],
        message: "No registered account found for this mobile number."
      };
    }

    const roles = this.getUserRoles(user.id);
    const businesses = this.getUserBusinesses(user.id);
    const hasCustomerRole = roles.includes("CUSTOMER");
    const hasPartnerRole = roles.includes("VENDOR_OWNER") || roles.includes("VENDOR_STAFF") || businesses.length > 0;

    return {
      exists: true,
      phone,
      userId: user.id,
      fullName: user.full_name || null,
      status: user.status || "ACTIVE",
      roles,
      hasCustomerRole,
      hasPartnerRole,
      businessCount: businesses.length,
      businesses: businesses.map((b) => ({ id: b.id, name: b.name, status: b.status, isVerified: !!b.is_verified })),
      message: "Account found."
    };
  }

  /**
>>>>>>> feature/superadmin
   * Resend OTP for an existing challenge with cooldown enforcement
   */
  async resendOtp(challengeId: string) {
    const challenge = this.db.queryOne<any>("SELECT * FROM otp_challenges WHERE id = ?", [challengeId]);
    if (!challenge) {
      throw new BadRequestException("Invalid OTP challenge reference.");
    }
    if (challenge.verified_at) {
      throw new BadRequestException("This challenge has already been verified.");
    }

    const now = new Date();
    const lastSentTime = new Date(challenge.created_at).getTime();
    const elapsedSeconds = Math.floor((now.getTime() - lastSentTime) / 1000);
    if (elapsedSeconds < APP_CONFIG.auth.otpCooldownSeconds) {
      const remaining = APP_CONFIG.auth.otpCooldownSeconds - elapsedSeconds;
      throw new BadRequestException(`Please wait ${remaining} seconds before resending OTP.`);
    }

    // Generate new OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashString(rawOtp);
    const expiresAt = new Date(now.getTime() + APP_CONFIG.auth.otpTtlSeconds * 1000).toISOString();

    this.db.execute(
      `UPDATE otp_challenges 
       SET otp_code_hash = ?, attempts_count = 0, expires_at = ?, created_at = ?
       WHERE id = ?`,
      [otpHash, expiresAt, now.toISOString(), challengeId]
    );

    if (process.env.NODE_ENV !== "production") {
      console.log(`[SMS GATEWAY RESEND] To: ${challenge.phone_number} | Verification Code: ${rawOtp}`);
    }

    return {
      challengeId,
      expiresInSeconds: APP_CONFIG.auth.otpTtlSeconds,
      resendCooldownSeconds: APP_CONFIG.auth.otpCooldownSeconds,
      ...(process.env.NODE_ENV !== "production" ? { devOtp: rawOtp } : {})
    };
  }

  /**
   * Get all active sessions for authenticated user
   */
  getUserSessions(userId: string) {
    return this.db.query<any>(
      `SELECT id, device_info as deviceInfo, ip_address as ipAddress, expires_at as expiresAt, created_at as createdAt
       FROM user_sessions
       WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string) {
    const now = new Date().toISOString();
    this.db.execute(
      "UPDATE user_sessions SET revoked_at = ? WHERE id = ? AND user_id = ?",
      [now, sessionId, userId]
    );
    return { success: true, message: "Session revoked successfully." };
  }

  /**
   * Revoke all active sessions
   */
  async logoutAll(userId: string) {
    const now = new Date().toISOString();
    this.db.execute("UPDATE user_sessions SET revoked_at = ? WHERE user_id = ?", [now, userId]);
    return { success: true, message: "All sessions revoked successfully." };
  }

  /**
   * Role switcher for dual-mode / privileged accounts
   */
  async switchRole(userId: string, targetRole: string) {
    const userRoles = this.getUserRoles(userId);
    const normalizedTarget = targetRole.toUpperCase();
    if (!userRoles.includes(normalizedTarget)) {
      throw new ForbiddenException(`User is not authorized for role '${targetRole}'.`);
    }

    const user = this.db.queryOne<any>("SELECT * FROM users WHERE id = ?", [userId]);
    const now = new Date();
    const token = this.signJwt({
      sub: user.id,
      phone: user.phone_number,
      roles: [normalizedTarget],
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(now.getTime() / 1000) + APP_CONFIG.auth.accessTokenTtlMinutes * 60
    });

    return {
      activeRole: normalizedTarget,
      accessToken: token
    };
  }

  /**
   * Enterprise Administrator Password Login + MFA
   */
  async adminLogin(email: string, password: string, deviceInfo = "Admin Console", ipAddress = "127.0.0.1") {
    if (!email || !password) {
      throw new BadRequestException("Email and password are required.");
    }

    const user = this.db.queryOne<any>("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      throw new UnauthorizedException("Invalid administrator credentials.");
    }

    const roles = this.getUserRoles(user.id);
    const hasAdminAccess = roles.includes("SUPER_ADMIN") || roles.includes("OPERATIONS");
    if (!hasAdminAccess) {
      throw new ForbiddenException("Access denied: Not authorized for Super Admin console.");
    }

    // Verify Password
    if (!user.password_hash) {
      throw new UnauthorizedException("Invalid administrator credentials.");
    }
    const isPasswordValid = this.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid administrator credentials.");
    }

    // Check if 2FA / MFA is enabled in preferences
    const prefs = this.db.queryOne<any>("SELECT two_factor_auth FROM admin_preferences WHERE user_id = ?", [user.id]);
    const requiresMfa = prefs ? Boolean(prefs.two_factor_auth) : false;

    if (requiresMfa) {
      // Issue MFA challenge
      const rawMfa = crypto.randomInt(100000, 999999).toString();
      const mfaHash = this.hashString(rawMfa);
      const mfaChallengeId = `mfa_${crypto.randomUUID()}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

      this.db.execute(
        `INSERT INTO auth_mfa_challenges (id, user_id, code_hash, expires_at, attempts_count, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [mfaChallengeId, user.id, mfaHash, expiresAt, now.toISOString()]
      );

      if (process.env.NODE_ENV !== "production") {
        console.log(`[ADMIN MFA CODE] User: ${user.email} | Code: ${rawMfa} (Valid 5 mins)`);
      }

      return {
        requiresMfa: true,
        mfaChallengeId,
        expiresInSeconds: 300,
        maskedEmail: user.email.replace(/(.{2})(.*)(?=@)/, (_: any, a: any, b: any) => a + "*".repeat(b.length)),
        ...(process.env.NODE_ENV !== "production" ? { devMfaCode: rawMfa } : {})
      };
    }

    // If MFA is not required or already completed, issue tokens directly
    const now = new Date();
    const sessionId = `sess_${crypto.randomUUID()}`;
    const rawRefreshToken = `rft_${crypto.randomBytes(32).toString("hex")}`;
    const refreshTokenHash = this.hashString(rawRefreshToken);
    const sessionExpiresAt = new Date(now.getTime() + APP_CONFIG.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000).toISOString();

    this.db.execute(
      `INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, user.id, refreshTokenHash, deviceInfo, ipAddress, sessionExpiresAt, now.toISOString()]
    );

    const accessToken = this.signJwt({
      sub: user.id,
      phone: user.phone_number,
      roles,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(now.getTime() / 1000) + APP_CONFIG.auth.accessTokenTtlMinutes * 60
    });

    return {
      requiresMfa: false,
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: "Bearer" as const,
      expiresIn: APP_CONFIG.auth.accessTokenTtlMinutes * 60,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: "SUPER_ADMIN",
        roles
      }
    };
  }

  /**
   * Verify Admin MFA Challenge
   */
  async verifyAdminMfa(mfaChallengeId: string, code: string, deviceInfo = "Admin Console", ipAddress = "127.0.0.1") {
    if (!mfaChallengeId || !code) {
      throw new BadRequestException("MFA challenge ID and verification code are required.");
    }

    const challenge = this.db.queryOne<any>("SELECT * FROM auth_mfa_challenges WHERE id = ?", [mfaChallengeId]);
    if (!challenge) {
      throw new BadRequestException("Invalid MFA challenge reference.");
    }
    if (challenge.verified_at) {
      throw new BadRequestException("This MFA code has already been verified.");
    }

    const now = new Date();
    if (new Date(challenge.expires_at) < now) {
      throw new BadRequestException("MFA code expired. Please log in again.");
    }

    if (challenge.attempts_count >= 5) {
      throw new ForbiddenException("Maximum MFA verification attempts exceeded.");
    }

    const inputHash = this.hashString(code);
    if (inputHash !== challenge.code_hash) {
      this.db.execute("UPDATE auth_mfa_challenges SET attempts_count = attempts_count + 1 WHERE id = ?", [mfaChallengeId]);
      throw new UnauthorizedException("Incorrect MFA verification code.");
    }

    // Mark challenge verified
    this.db.execute("UPDATE auth_mfa_challenges SET verified_at = ? WHERE id = ?", [now.toISOString(), mfaChallengeId]);

    const user = this.db.queryOne<any>("SELECT * FROM users WHERE id = ?", [challenge.user_id]);
    const roles = this.getUserRoles(user.id);

    const sessionId = `sess_${crypto.randomUUID()}`;
    const rawRefreshToken = `rft_${crypto.randomBytes(32).toString("hex")}`;
    const refreshTokenHash = this.hashString(rawRefreshToken);
    const sessionExpiresAt = new Date(now.getTime() + APP_CONFIG.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000).toISOString();

    this.db.execute(
      `INSERT INTO user_sessions (id, user_id, refresh_token_hash, device_info, ip_address, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, user.id, refreshTokenHash, deviceInfo, ipAddress, sessionExpiresAt, now.toISOString()]
    );

    const accessToken = this.signJwt({
      sub: user.id,
      phone: user.phone_number,
      roles,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(now.getTime() / 1000) + APP_CONFIG.auth.accessTokenTtlMinutes * 60
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: "Bearer" as const,
      expiresIn: APP_CONFIG.auth.accessTokenTtlMinutes * 60,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: "SUPER_ADMIN",
        roles
      }
    };
  }

  // Password Hashing & Verification (scrypt with salt)
  public hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  public verifyPassword(password: string, storedHash: string): boolean {
    try {
      const [salt, key] = storedHash.split(":");
      if (!salt || !key) return false;
      const keyBuffer = Buffer.from(key, "hex");
      const derivedKey = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    } catch {
      return false;
    }
  }

  // Cryptographic Helpers
  public hashString(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  private signJwt(payload: TokenPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", this.jwtSecret)
      .update(`${header}.${body}`)
      .digest("base64url");
    return `${header}.${body}.${signature}`;
  }

  public verifyAccessToken(token: string): TokenPayload {
    return this.verifyJwt(token);
  }

  public verifyJwt(token: string): TokenPayload {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT structure");
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
}

