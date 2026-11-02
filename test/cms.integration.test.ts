import { test } from "node:test";
import * as assert from "node:assert/strict";
import { DatabaseService } from "../src/database/database.service";
import { CmsService } from "../src/cms/cms.service";

test("HELLO-HI Super Admin CMS Module Integration Test Suite", async (t) => {
  const db = new DatabaseService();
  db.initDatabase(true); // isolated in-memory SQLite database
  const cmsService = new CmsService(db);

  const superAdmin = { name: "Super Admin", role: "SUPER_ADMIN" };
  const cmsViewer = { name: "Viewer User", role: "CMS_VIEWER" };

  await t.test("1. CMS 6 Submenus Initialization & Relational Storage", () => {
    const pages = cmsService.getAllPages("en");
    assert.equal(pages.length, 6, "All 6 required submenus must be seeded in English");

    const expectedSlugs = [
      "terms-and-conditions",
      "privacy-policy",
      "faqs",
      "about-us",
      "refund-cancellation-policy",
      "contact-support"
    ];

    for (const slug of expectedSlugs) {
      const found = pages.find((p) => p.slug === slug);
      assert.ok(found, `Submenu page '${slug}' must exist`);
      assert.equal(found.status, "PUBLISHED", `Initial status of '${slug}' must be PUBLISHED`);
      assert.equal(found.visibility, "PUBLIC", `Initial visibility of '${slug}' must be PUBLIC`);
    }
  });

  await t.test("2. Page Content Retrieval & FAQ Dedicated Structure", () => {
    const terms = cmsService.getPageBySlug("terms-and-conditions", "en");
    assert.equal(terms.title, "Terms & Conditions");
    assert.ok(terms.content.includes("1. Introduction"), "Terms content must have structured text");
    assert.equal(terms.seo.metaTitle, "Terms & Conditions | Hello-Hi");

    const faqs = cmsService.getPageBySlug("faqs", "en");
    assert.ok(Array.isArray(faqs.faqItems), "FAQs must have dedicated faqItems array");
    assert.ok(faqs.faqItems.length >= 4, "Must have initial FAQ entries");
    assert.ok(faqs.faqItems.some((f: any) => f.question.includes("Hello-Hi")), "FAQ question content check");
  });

  await t.test("3. Draft Editing & Revision Creation", () => {
    const updatedDraft = cmsService.updatePage(
      "terms-and-conditions",
      {
        shortDescription: "Updated short description for legal compliance review.",
        content: "<h2>1. Introduction</h2><p>Updated terms content.</p>",
        changeSummary: "Updated paragraph 1 for DPDP 2023 alignment",
      },
      superAdmin,
      "en"
    );

    assert.equal(updatedDraft.shortDescription, "Updated short description for legal compliance review.");

    // Check that a new revision was created
    const revisions = cmsService.getRevisions("terms-and-conditions", "en");
    assert.ok(revisions.length >= 2, "A new revision must be snapshot upon meaningful draft update");
    assert.equal(revisions[0].revisionNumber, 2);
    assert.equal(revisions[0].changeSummary, "Updated paragraph 1 for DPDP 2023 alignment");
  });

  await t.test("4. Publishing Lifecycle & Preservation of Published Version", () => {
    // Current published revision before new publish
    const pubBefore = cmsService.getPublicPage("terms-and-conditions", "en");
    assert.ok(pubBefore, "Public page must be readable");

    // Publish new revision
    const publishedPage = cmsService.publishPage("terms-and-conditions", superAdmin, "en");
    assert.equal(publishedPage.status, "PUBLISHED");

    // Public content must now reflect the newly published content
    const pubAfter = cmsService.getPublicPage("terms-and-conditions", "en");
    assert.ok(pubAfter.content.includes("Updated terms content."));
  });

  await t.test("5. Status Transitions & Visibility Isolation", () => {
    // Update status to IN_REVIEW
    cmsService.updateStatus("terms-and-conditions", "IN_REVIEW", superAdmin, "en");
    let page = cmsService.getPageBySlug("terms-and-conditions", "en");
    assert.equal(page.status, "IN_REVIEW");

    // Public endpoint must reject unpublished / in-review pages
    assert.throws(
      () => cmsService.getPublicPage("terms-and-conditions", "en"),
      /unpublished/i,
      "Public endpoint must block access to pages not in PUBLISHED status"
    );

    // Re-publish
    cmsService.publishPage("terms-and-conditions", superAdmin, "en");

    // Update visibility to PRIVATE
    cmsService.updateVisibility("terms-and-conditions", "PRIVATE", superAdmin, "en");
    page = cmsService.getPageBySlug("terms-and-conditions", "en");
    assert.equal(page.visibility, "PRIVATE");

    // Public endpoint must reject private content
    assert.throws(
      () => cmsService.getPublicPage("terms-and-conditions", "en"),
      /private/i,
      "Public endpoint must block access to pages with PRIVATE visibility"
    );

    // Reset visibility to PUBLIC
    cmsService.updateVisibility("terms-and-conditions", "PUBLIC", superAdmin, "en");
  });

  await t.test("6. Revision Rollback / Restore to Draft", () => {
    const revisions = cmsService.getRevisions("terms-and-conditions", "en");
    const baselineRevision = revisions.find((r) => r.revisionNumber === 1);
    assert.ok(baselineRevision, "Revision #1 must exist");

    // Restore revision #1
    const restoredPage = cmsService.restoreRevision("terms-and-conditions", baselineRevision.id, superAdmin, "en");
    assert.equal(restoredPage.status, "DRAFT", "Restored revision must become an active draft");
    assert.ok(restoredPage.content.includes("1. Introduction"), "Restored content must match revision #1 content");

    // Check revision list grew without destroying previous revisions
    const updatedRevisions = cmsService.getRevisions("terms-and-conditions", "en");
    assert.ok(updatedRevisions.length > revisions.length, "Rollback must append a new revision snapshot");
  });

  await t.test("7. Multilingual Localization & Translation Fallback", () => {
    // Query Telugu ('te') when not yet explicitly translated -> should gracefully fallback to English
    const teFallback = cmsService.getPageBySlug("about-us", "te");
    assert.ok(teFallback, "Should return page");
    assert.equal(teFallback.isTranslationFallback, true, "Should indicate translation fallback");

    // Create Telugu translation draft
    const tePage = cmsService.updatePage(
      "about-us",
      {
        title: "మా గురించి (About Us)",
        shortDescription: "హలో-హై గురించి పూర్తి సమాచారం.",
        content: "<h2>ఆంధ్రప్రదేశ్ హైపర్‌లోకల్ వేదిక</h2><p>స్థానిక వ్యాపారాలను వేగంగా కనుగొనండి.</p>",
      },
      superAdmin,
      "te"
    );

    assert.equal(tePage.title, "మా గురించి (About Us)");
    assert.equal(tePage.language, "te");

    // Query Telugu again -> now returns Telugu translation directly
    const teLoaded = cmsService.getPageBySlug("about-us", "te");
    assert.equal(teLoaded.isTranslationFallback, false);
    assert.equal(teLoaded.title, "మా గురించి (About Us)");

    // English page remains unaffected
    const enPage = cmsService.getPageBySlug("about-us", "en");
    assert.equal(enPage.title, "About Us");
  });

  await t.test("8. Permission Enforcement (Role-Based Access Control)", () => {
    // CMS Viewer role must not have permission to publish
    assert.throws(
      () => cmsService.publishPage("about-us", cmsViewer, "en"),
      /do not have publishing privileges/i,
      "Viewer role must be prohibited from publishing"
    );
  });

  await t.test("9. Administrative Audit Trail Integrity", () => {
    const logs = cmsService.getAuditLogs("terms-and-conditions", "en");
    assert.ok(logs.length >= 3, "Audit trail must capture each administrative state change");

    const publishLog = logs.find((l) => l.action === "PUBLISH");
    assert.ok(publishLog, "Must contain PUBLISH audit entry");
    assert.equal(publishLog.performedBy, "Super Admin");
    assert.ok(publishLog.timestamp, "Audit record must contain ISO timestamp");
  });
});
