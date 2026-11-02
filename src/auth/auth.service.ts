import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { isValidIndianPhone, normalizeIndianPhone, isValidOtp } from "@hello/validation";
import { APP_CONFIG } from "@hello/config";
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
  async sendOtp(rawPhone: string, purpose = "LOGIN") {
    if (!isValidIndianPhone(rawPhone)) {
      throw new BadRequestException("Phone number must be a valid Indian mobile number (+91XXXXXXXXXX)");
    }

    const phone = normalizeIndianPhone(rawPhone);
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
      `INSERT INTO otp_challenges (id, phone_number, otp_code_hash, attempts_count, purpose, expires_at, created_at)
       VALUES (?, ?, ?, 0, ?, ?, ?)`,
      [challengeId, phone, otpHash, purpose, expiresAt, now.toISOString()]
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

      // Assign default CUSTOMER role
      const customerRole = this.db.queryOne<any>("SELECT id FROM roles WHERE name = 'CUSTOMER'");
      if (customerRole) {
        this.db.execute(
          `INSERT INTO user_permissions (id, user_id, role_id) VALUES (?, ?, ?)`,
          [`perm_${crypto.randomUUID()}`, userId, customerRole.id]
        );
      }

      user = this.db.queryOne<any>("SELECT * FROM users WHERE id = ?", [userId]);
    } else {
      // Update phone verification timestamp
      this.db.execute(
        "UPDATE users SET phone_verified_at = ?, updated_at = ? WHERE id = ?",
        [now.toISOString(), now.toISOString(), user.id]
      );
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
    const user = this.db.queryOne<any>("SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) throw new UnauthorizedException("User not found.");

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

  // Cryptographic Helpers
  private hashString(input: string): string {
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

