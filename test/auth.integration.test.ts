import { test } from "node:test";
import * as assert from "node:assert/strict";
import { DatabaseService } from "../src/database/database.service";
import { AuthService } from "../src/auth/auth.service";
import { UsersService } from "../src/users/users.service";

test("Phase 02 Authentication & Sessions Integration Suite", async (t) => {
  // Initialize isolated in-memory test database
  const db = new DatabaseService();
  db.initDatabase(true);
  const authService = new AuthService(db);
  const usersService = new UsersService(db, authService);

  const testPhone = "+919848012345";

  await t.test("1. Send OTP: Validates phone and dispatches challenge", async () => {
    const res = await authService.sendOtp(testPhone);
    assert.ok(res.challengeId.startsWith("chl_"));
    assert.equal(res.expiresInSeconds, 300);
    assert.equal(res.resendCooldownSeconds, 45);
    assert.ok(res.maskedPhone.includes("•••••"));
  });

  await t.test("2. Send OTP: Rejects invalid non-Indian phone number", async () => {
    await assert.rejects(
      async () => await authService.sendOtp("1234567"),
      /Phone number must be a valid Indian mobile number/
    );
  });

  await t.test("3. Send OTP: Enforces 45-second cooldown on immediate re-request", async () => {
    await assert.rejects(
      async () => await authService.sendOtp(testPhone),
      /Please wait \d+ seconds before requesting a new OTP/
    );
  });

  await t.test("4. Verify OTP: Rejects wrong OTP and increments attempt counter", async () => {
    const phone2 = "+919848099999";
    const challenge = await authService.sendOtp(phone2);

    await assert.rejects(
      async () => await authService.verifyOtp(challenge.challengeId, "000000"),
      /Incorrect OTP code\. 2 attempts remaining/
    );

    const row = db.queryOne<{ attempts_count: number }>(
      "SELECT attempts_count FROM otp_challenges WHERE id = ?",
      [challenge.challengeId]
    );
    assert.equal(row?.attempts_count, 1);
  });

  await t.test("5. Verify OTP: Successful verification creates user, session & JWT tokens", async () => {
    const phone3 = "+919848088888";
    const challenge = await authService.sendOtp(phone3);
    const validOtp = (challenge as any).devOtp;

    const authResult = await authService.verifyOtp(challenge.challengeId, validOtp, "iPhone 15 Pro", "192.168.1.100");

    assert.ok(authResult.accessToken, "Should return access token");
    assert.ok(authResult.refreshToken.startsWith("rft_"), "Should return refresh token");
    assert.equal(authResult.user.phoneNumber, phone3);
    assert.ok(authResult.user.roles.includes("CUSTOMER"), "Should possess default CUSTOMER role");
    assert.equal(authResult.user.isNewUser, true);

    const userRow = db.queryOne<{ status: string }>(
      "SELECT status FROM users WHERE id = ?",
      [authResult.user.id]
    );
    assert.equal(userRow?.status, "ACTIVE");

    // Token validation
    const payload = authService.validateUserToken(authResult.accessToken);
    assert.equal(payload.sub, authResult.user.id);
    assert.equal(payload.phone, phone3);

    // 6. Test Single-Use Refresh Token Rotation
    const rotated = await authService.rotateRefreshToken(authResult.refreshToken);
    assert.ok(rotated.accessToken);
    assert.ok(rotated.refreshToken);
    assert.notEqual(rotated.refreshToken, authResult.refreshToken, "Should rotate to a brand new refresh token");

    // 7. Test Replay Attack Prevention (Reusing old refresh token invalidates all user sessions)
    await assert.rejects(
      async () => await authService.rotateRefreshToken(authResult.refreshToken),
      /Compromised session detected/
    );

    // 8. Test Profile Update
    const updated = usersService.updateProfile(authResult.user.id, {
      fullName: "Ravi Kumar",
      email: "ravi.kumar@example.com"
    });
    assert.equal(updated.fullName, "Ravi Kumar");
    assert.equal(updated.email, "ravi.kumar@example.com");

    // 9. Test Mode Switching: User with 0 businesses cannot switch to Vendor Mode
    const switchRes = usersService.evaluateModeSwitch(authResult.user.id, "vendor");
    assert.equal(switchRes.canSwitch, false);
    assert.equal(switchRes.requiredAction, "REGISTER_BUSINESS");

    // Add an approved business in SQL for this user
    const bizId = "biz_test_dental_01";
    db.execute(
      `INSERT INTO businesses (id, name, slug, primary_phone, status, is_verified, created_at, updated_at)
       VALUES (?, 'Test Dental', 'test-dental', ?, 'APPROVED', 1, datetime('now'), datetime('now'))`,
      [bizId, phone3]
    );
    db.execute(
      `INSERT INTO business_owners (id, business_id, user_id, ownership_type, is_primary)
       VALUES ('bo_1', ?, ?, 'FOUNDER', 1)`,
      [bizId, authResult.user.id]
    );

    // Re-evaluate mode switch: Now user has 1 business!
    const switchResVendor = usersService.evaluateModeSwitch(authResult.user.id, "vendor");
    assert.equal(switchResVendor.canSwitch, true);
    assert.equal(switchResVendor.activeMode, "vendor");
    assert.equal(switchResVendor.primaryBusinessId, bizId);

    // 10. Test Logout
    const logoutRes = await authService.logout(authResult.user.id);
    assert.equal(logoutRes.success, true);
  });
});
