"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const database_service_1 = require("../src/database/database.service");
const categories_service_1 = require("../src/categories/categories.service");
const businesses_service_1 = require("../src/businesses/businesses.service");
const enquiries_service_1 = require("../src/enquiries/enquiries.service");
const reviews_service_1 = require("../src/reviews/reviews.service");
const users_service_1 = require("../src/users/users.service");
const auth_service_1 = require("../src/auth/auth.service");
(0, node_test_1.test)("Phase 03 Customer Discovery, Search, Enquiry & Review Integration Suite", async (t) => {
    const db = new database_service_1.DatabaseService();
    db.initDatabase(true);
    const authService = new auth_service_1.AuthService(db);
    const categoriesService = new categories_service_1.CategoriesService(db);
    const businessesService = new businesses_service_1.BusinessesService(db);
    const enquiriesService = new enquiries_service_1.EnquiriesService(db);
    const reviewsService = new reviews_service_1.ReviewsService(db);
    const usersService = new users_service_1.UsersService(db, authService);
    await t.test("1. Category Hierarchy & Services Taxonomy", async () => {
        const allCategories = categoriesService.getAllCategories();
        assert.ok(allCategories.length >= 10, "Should have 10 primary categories");
        const foodCat = allCategories.find((c) => c.slug === "restaurants-food");
        assert.ok(foodCat, "Food & Dining category must exist");
        assert.equal(foodCat.iconName, "UtensilsCrossed");
        const popular = categoriesService.getPopularCategories(4);
        assert.equal(popular.length, 4, "Should return requested limit of 4 popular categories");
        const categoryDetail = categoriesService.getCategoryBySlug("restaurants-food");
        assert.equal(categoryDetail.name, "Restaurants & Dining");
        assert.ok(categoryDetail.services.length >= 2, "Category should have services attached");
        assert.ok(categoryDetail.services.some((s) => s.slug === "biryani-tandoor"));
    });
    await t.test("2. Business Search with Faceted Filters", async () => {
        const vjaResults = businessesService.searchBusinesses({ citySlug: "vijayawada" });
        assert.ok(vjaResults.items.length >= 3, "Vijayawada should have at least 3 businesses");
        assert.ok(vjaResults.items.every((b) => b.location.citySlug === "vijayawada"));
        const dentalResults = businessesService.searchBusinesses({ categorySlug: "dental-care" });
        assert.ok(dentalResults.items.length >= 2, "Dental category should return Siri Dental & Fernat");
        assert.ok(dentalResults.items.some((b) => b.slug === "siri-dental-clinic"));
        const keywordResults = businessesService.searchBusinesses({ q: "biryani" });
        assert.ok(keywordResults.items.length >= 1, "Should find Amravati Grand Restaurant for 'biryani'");
        assert.equal(keywordResults.items[0].slug, "amravati-grand-restaurant");
        const topRated = businessesService.searchBusinesses({ minRating: 4.8 });
        assert.ok(topRated.items.every((b) => b.averageRating >= 4.8));
        const distanceResults = businessesService.searchBusinesses({
            userLat: 16.5120,
            userLng: 80.6515,
            sortBy: "distance",
        });
        assert.ok(distanceResults.items[0].location.distanceKm !== undefined);
        assert.ok(distanceResults.items[0].location.distanceKm < 2.0, "Closest business should be within 2km");
    });
    await t.test("3. Business Detail Profile & Working Hours", async () => {
        const biz = businessesService.getBusinessBySlug("amravati-grand-restaurant", 16.5120, 80.6515);
        assert.equal(biz.name, "Amravati Grand Restaurant");
        assert.equal(biz.isVerified, true);
        assert.ok(biz.averageRating >= 4.5);
        assert.ok(biz.locations.length >= 1);
        assert.equal(biz.locations[0].cityName, "Vijayawada");
        assert.equal(biz.locations[0].localityName, "Nahamar");
        assert.equal(biz.contacts.primaryPhone, "+919848011111");
        assert.ok(biz.hours.length === 7, "Must have 7 days working hours");
        assert.ok(biz.media.length >= 2, "Must have media images");
        assert.ok(biz.reviews.length >= 1, "Must have customer reviews");
    });
    await t.test("4. Customer Enquiry Generation & Lifecycle", async () => {
        const biz = businessesService.getBusinessBySlug("amravati-grand-restaurant");
        const initialEnquiriesCount = biz.totalEnquiries;
        const enquiry = enquiriesService.createEnquiry({
            businessId: biz.id,
            customerName: "Suresh Reddy",
            customerPhone: "9848123456",
            message: "Looking for banquet hall booking for 50 guests this weekend.",
            priority: "HIGH",
        });
        assert.ok(enquiry.id.startsWith("enq-"));
        assert.ok(enquiry.referenceNo.startsWith("ENQ-2026-"));
        assert.equal(enquiry.status, "NEW");
        assert.equal(enquiry.customerPhone, "+919848123456");
        const fetched = enquiriesService.getEnquiryByReference(enquiry.referenceNo);
        assert.equal(fetched.referenceNo, enquiry.referenceNo);
        assert.ok(fetched.timeline.length >= 1);
        assert.equal(fetched.timeline[0].newStatus, "NEW");
        const updatedBiz = businessesService.getBusinessBySlug("amravati-grand-restaurant");
        assert.equal(updatedBiz.totalEnquiries, initialEnquiriesCount + 1);
        const customerEnquiries = enquiriesService.getCustomerEnquiries(fetched.customerId || enquiry.customerPhone);
        const customerRow = db.queryOne("SELECT id FROM users WHERE phone_number = '+919848123456'");
        assert.ok(customerRow);
        const myEnquiries = enquiriesService.getCustomerEnquiries(customerRow.id);
        assert.ok(myEnquiries.some((e) => e.referenceNo === enquiry.referenceNo));
    });
    await t.test("5. Reviews System & Dynamic Average Rating Recalculation", async () => {
        const biz = businessesService.getBusinessBySlug("biz-fernat-dental");
        const initialAvg = biz.averageRating;
        const initialCount = biz.totalReviews;
        const reviewerId = "user-reviewer-1";
        db.execute("INSERT INTO users (id, phone_number, full_name, status, created_at, updated_at) VALUES (?, '+919848555555', 'Ananya Sharma', 'ACTIVE', datetime('now'), datetime('now'))", [reviewerId]);
        const reviewResult = reviewsService.addOrUpdateReview({
            businessId: "biz-fernat-dental",
            userId: reviewerId,
            rating: 5,
            reviewText: "Excellent clinic! Very gentle and professional teeth whitening.",
        });
        assert.ok(reviewResult.id);
        assert.equal(reviewResult.rating, 5);
        const reviewsList = reviewsService.getBusinessReviews("biz-fernat-dental");
        assert.ok(reviewsList.reviews.some((r) => r.userId === reviewerId));
        assert.equal(reviewsList.breakdown[5], 1);
        const updatedBiz = businessesService.getBusinessBySlug("biz-fernat-dental");
        assert.equal(updatedBiz.totalReviews, 1);
        assert.equal(updatedBiz.averageRating, 5);
    });
    await t.test("6. Saved Businesses (Bookmarks) Toggle & Listing", async () => {
        const customerRow = db.queryOne("SELECT id FROM users WHERE phone_number = '+919848099999'");
        const userId = customerRow.id;
        const saveRes = usersService.toggleSavedBusiness(userId, "biz-amravati");
        assert.equal(saveRes.isSaved, true);
        const savedList = usersService.getSavedBusinesses(userId);
        assert.ok(savedList.some((b) => b.id === "biz-amravati"));
        const unsaveRes = usersService.toggleSavedBusiness(userId, "biz-amravati");
        assert.equal(unsaveRes.isSaved, false);
        const updatedSaved = usersService.getSavedBusinesses(userId);
        assert.ok(!updatedSaved.some((b) => b.id === "biz-amravati"));
    });
});
//# sourceMappingURL=discovery.integration.test.js.map