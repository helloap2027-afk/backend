"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const database_service_1 = require("../src/database/database.service");
const locations_service_1 = require("../src/locations/locations.service");
(0, node_test_1.test)("Phase 02 Locations & Geography Hierarchy Integration Suite", async (t) => {
    const db = new database_service_1.DatabaseService();
    db.initDatabase(true);
    const locationsService = new locations_service_1.LocationsService(db);
    await t.test("1. Geography Hierarchy: Fetch States, Districts, Cities, Localities", async () => {
        const states = locationsService.getStates();
        assert.ok(states.length >= 1, "Should have seeded Andhra Pradesh");
        assert.equal(states[0].name, "Andhra Pradesh");
        assert.equal(states[0].code, "AP");
        const districts = locationsService.getDistricts(states[0].id);
        assert.ok(districts.some((d) => d.name === "Krishna"));
        assert.ok(districts.some((d) => d.name === "Guntur"));
        const cities = locationsService.getCities();
        assert.ok(cities.some((c) => c.name === "Vijayawada"));
        assert.ok(cities.some((c) => c.name === "Guntur"));
        const vjaCity = locationsService.getCityBySlug("vijayawada");
        assert.equal(vjaCity.name, "Vijayawada");
        const localities = locationsService.getLocalities(vjaCity.id);
        assert.ok(localities.some((l) => l.name === "Nahamar"));
        assert.ok(localities.some((l) => l.name === "Benz Circle"));
    });
    await t.test("2. PIN Code Search: Resolves locality, city and state", async () => {
        const pinResult = locationsService.lookupPincode("520008");
        assert.equal(pinResult.pincode, "520008");
        assert.equal(pinResult.cityName, "Vijayawada");
        assert.equal(pinResult.stateName, "Andhra Pradesh");
        assert.ok(pinResult.matchingLocalities.some((l) => l.name === "Nahamar"));
    });
    await t.test("3. Reverse Geocoding: GPS coordinates resolve to closest city & locality", async () => {
        const geo = locationsService.reverseGeocode(16.5120, 80.6515);
        assert.equal(geo.closestCity.name, "Vijayawada");
        assert.equal(geo.closestCity.slug, "vijayawada");
        assert.ok(geo.closestCity.distanceKm < 1.0, `Expected distance < 1km, got ${geo.closestCity.distanceKm}`);
        assert.equal(geo.closestLocality?.name, "Nahamar");
    });
    await t.test("4. Reverse Geocoding: Rejects coordinates outside India", async () => {
        assert.throws(() => locationsService.reverseGeocode(51.5074, -0.1278), /Coordinates provided are outside the boundary of India/);
    });
    await t.test("5. Dynamic Admin Management: Add future states & cities without code changes", async () => {
        const newState = locationsService.addState("Telangana", "TG");
        assert.equal(newState.name, "Telangana");
        assert.equal(newState.code, "TG");
        const newDistrict = locationsService.addDistrict(newState.id, "Warangal");
        assert.equal(newDistrict.name, "Warangal");
        const newCity = locationsService.addCity(newDistrict.id, "Warangal", 17.9689, 79.5941);
        assert.equal(newCity.name, "Warangal");
        assert.equal(newCity.slug, "warangal");
        const newLocality = locationsService.addLocality(newCity.id, "Hanamkonda", "506001", 17.9975, 79.5620);
        assert.equal(newLocality.name, "Hanamkonda");
        assert.equal(newLocality.pincode, "506001");
        const lookup = locationsService.lookupPincode("506001");
        assert.equal(lookup.cityName, "Warangal");
        assert.equal(lookup.stateName, "Telangana");
    });
});
//# sourceMappingURL=locations.integration.test.js.map