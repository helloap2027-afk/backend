import { test } from "node:test";
import * as assert from "node:assert/strict";
import { DatabaseService } from "../src/database/database.service";
import { AuthService } from "../src/auth/auth.service";
import { BusinessesService } from "../src/businesses/businesses.service";

test("Phase 1 Enterprise Authentication, Registration & Admin MFA Test Suite", async (t) => {
  const db = new DatabaseService();
  db.initDatabase(true);
  const authService = new AuthService(db);
  const businessesService = new BusinessesService(db);

  await t.test("1. Admin Password Login: Validates admin123 with scrypt and issues tokens", async () => {
    const res = await authService.adminLogin("admin@hello-hi.in", "admin123");
    assert.equal(res.requiresMfa, false);
    assert.ok(res.accessToken);
    assert.ok(res.refreshToken.startsWith("rft_"));
    assert.equal(res.user?.role, "SUPER_ADMIN");
  });

  await t.test("2. Admin Password Login: Rejects incorrect password", async () => {
    await assert.rejects(
      async () => await authService.adminLogin("admin@hello-hi.in", "wrongpass"),
      /Invalid administrator credentials/
    );
  });

  await t.test("3. Admin MFA: Enforces two-factor verification challenge when enabled", async () => {
    // Enable 2FA for admin
    db.execute("UPDATE admin_preferences SET two_factor_auth = 1 WHERE user_id = 'usr_super_admin'");

    const mfaRes = (await authService.adminLogin("admin@hello-hi.in", "admin123")) as any;
    assert.equal(mfaRes.requiresMfa, true);
    assert.ok(mfaRes.mfaChallengeId?.startsWith("mfa_"));
    assert.equal(mfaRes.expiresInSeconds, 300);

    const devCode = mfaRes.devMfaCode;
    assert.ok(devCode);

    // Verify MFA code
    const verifyRes = await authService.verifyAdminMfa(mfaRes.mfaChallengeId, devCode);
    assert.ok(verifyRes.accessToken);
    assert.equal(verifyRes.user.role, "SUPER_ADMIN");

    // Reset 2FA
    db.execute("UPDATE admin_preferences SET two_factor_auth = 0 WHERE user_id = 'usr_super_admin'");
  });

  await t.test("4. OTP Resend: Adheres to cooldown and invalidates old code", async () => {
    const phone = "+919848033333";
    const chl = await authService.sendOtp(phone);
    assert.ok(chl.challengeId);

    // Immediate resend must fail cooldown
    await assert.rejects(
      async () => await authService.resendOtp(chl.challengeId),
      /Please wait \d+ seconds before resending OTP/
    );

    // Fast-forward created_at by 50 seconds in test DB
    const sixtySecsAgo = new Date(Date.now() - 60000).toISOString();
    db.execute("UPDATE otp_challenges SET created_at = ? WHERE id = ?", [sixtySecsAgo, chl.challengeId]);

    // Resend succeeds
    const resend = await authService.resendOtp(chl.challengeId);
    assert.equal(resend.challengeId, chl.challengeId);
    assert.ok((resend as any).devOtp);
  });

  await t.test("5. Session Management: List active sessions and revoke session", async () => {
    const phone = "+919848044444";
    const chl = await authService.sendOtp(phone);
    const auth = await authService.verifyOtp(chl.challengeId, (chl as any).devOtp, "MacBook Pro Chrome");

    const sessions = authService.getUserSessions(auth.user.id);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].deviceInfo, "MacBook Pro Chrome");

    // Revoke session
    const revokeRes = await authService.revokeSession(auth.user.id, sessions[0].id);
    assert.equal(revokeRes.success, true);

    const updatedSessions = authService.getUserSessions(auth.user.id);
    assert.equal(updatedSessions.length, 0);
  });

  await t.test("6. Vendor Onboarding: Submits business details, links owner, assigns VENDOR_OWNER role", async () => {
    const vendorPhone = "+919848055555";
    const chl = await authService.sendOtp(vendorPhone);
    const auth = await authService.verifyOtp(chl.challengeId, (chl as any).devOtp);
    const vendorId = auth.user.id;

    const regRes = businessesService.registerVendorBusiness(vendorId, {
      name: "Lakshmi Dental & Orthodontic Care",
      categoryId: "cat-dentists",
      cityId: "city-vja",
      addressLine1: "Opposite PVP Mall, MG Road",
      pincode: "520010"
    });

    assert.ok(regRes.businessId.startsWith("biz_"));
    assert.equal(regRes.status, "PENDING");
    assert.equal(regRes.isVerified, false);

    // Check roles now include VENDOR_OWNER
    const roles = authService.getUserRoles(vendorId);
    assert.ok(roles.includes("VENDOR_OWNER"));

    // Check status retrieval
    const statusList = businessesService.getVendorRegistrationStatus(vendorId);
    assert.equal(statusList.length, 1);
    assert.equal(statusList[0].name, "Lakshmi Dental & Orthodontic Care");
    assert.equal(statusList[0].status, "PENDING");
  });
});
