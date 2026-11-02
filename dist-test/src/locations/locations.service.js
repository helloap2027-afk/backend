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
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const utils_1 = require("@hello/utils");
const validation_1 = require("@hello/validation");
let LocationsService = class LocationsService {
    constructor(db) {
        this.db = db;
    }
    getStates() {
        return this.db.query("SELECT * FROM states WHERE is_active = 1 ORDER BY name ASC");
    }
    getDistricts(stateId) {
        return this.db.query("SELECT * FROM districts WHERE state_id = ? ORDER BY name ASC", [stateId]);
    }
    getCities(districtId) {
        if (districtId) {
            return this.db.query("SELECT * FROM cities WHERE district_id = ? AND is_active = 1 ORDER BY name ASC", [districtId]);
        }
        return this.db.query(`SELECT c.id, c.name, c.slug, c.latitude, c.longitude, d.name as district_name, s.name as state_name
       FROM cities c
       JOIN districts d ON c.district_id = d.id
       JOIN states s ON d.state_id = s.id
       WHERE c.is_active = 1
       ORDER BY c.name ASC`);
    }
    getCityBySlug(slug) {
        const city = this.db.queryOne("SELECT * FROM cities WHERE slug = ? AND is_active = 1", [slug]);
        if (!city)
            throw new common_1.NotFoundException(`City with slug '${slug}' not found.`);
        return city;
    }
    getLocalities(cityId) {
        return this.db.query("SELECT * FROM localities WHERE city_id = ? AND is_active = 1 ORDER BY name ASC", [cityId]);
    }
    lookupPincode(pincode) {
        if (!(0, validation_1.isValidPincode)(pincode)) {
            throw new common_1.BadRequestException("PIN code must be a valid 6-digit Indian Postal Index Number.");
        }
        const localities = this.db.query(`SELECT l.id as locality_id, l.name as locality_name, l.slug as locality_slug,
              c.id as city_id, c.name as city_name, c.slug as city_slug,
              s.name as state_name
       FROM localities l
       JOIN cities c ON l.city_id = c.id
       JOIN districts d ON c.district_id = d.id
       JOIN states s ON d.state_id = s.id
       WHERE l.pincode = ? AND l.is_active = 1`, [pincode]);
        if (localities.length === 0) {
            throw new common_1.NotFoundException(`No localities mapped to PIN code ${pincode} in active registry.`);
        }
        return {
            pincode,
            cityName: localities[0].city_name,
            citySlug: localities[0].city_slug,
            stateName: localities[0].state_name,
            matchingLocalities: localities.map((l) => ({
                id: l.locality_id,
                name: l.locality_name,
                slug: l.locality_slug
            }))
        };
    }
    reverseGeocode(lat, lng) {
        if (!(0, validation_1.isValidCoordinates)(lat, lng)) {
            throw new common_1.BadRequestException("Coordinates provided are outside the boundary of India.");
        }
        const allCities = this.db.query("SELECT * FROM cities WHERE is_active = 1");
        if (allCities.length === 0) {
            throw new common_1.NotFoundException("No active cities available in database.");
        }
        let closestCity = allCities[0];
        let minCityDistance = (0, utils_1.calculateHaversineDistanceKm)(lat, lng, Number(closestCity.latitude), Number(closestCity.longitude));
        for (let i = 1; i < allCities.length; i++) {
            const city = allCities[i];
            const dist = (0, utils_1.calculateHaversineDistanceKm)(lat, lng, Number(city.latitude), Number(city.longitude));
            if (dist < minCityDistance) {
                minCityDistance = dist;
                closestCity = city;
            }
        }
        const localities = this.db.query("SELECT * FROM localities WHERE city_id = ? AND is_active = 1", [closestCity.id]);
        let closestLocality = null;
        let minLocDistance = Infinity;
        for (const loc of localities) {
            const dist = (0, utils_1.calculateHaversineDistanceKm)(lat, lng, Number(loc.latitude), Number(loc.longitude));
            if (dist < minLocDistance) {
                minLocDistance = dist;
                closestLocality = {
                    id: loc.id,
                    name: loc.name,
                    slug: loc.slug,
                    pincode: loc.pincode,
                    distanceKm: dist
                };
            }
        }
        return {
            closestCity: {
                id: closestCity.id,
                name: closestCity.name,
                slug: closestCity.slug,
                distanceKm: minCityDistance
            },
            closestLocality: closestLocality || undefined,
            coordinates: { lat, lng }
        };
    }
    findNearbyBusinesses(lat, lng, radiusKm = 10, limit = 20) {
        if (!(0, validation_1.isValidCoordinates)(lat, lng)) {
            throw new common_1.BadRequestException("Invalid geographical coordinates.");
        }
        const locations = this.db.query(`SELECT bl.business_id, bl.latitude, bl.longitude, bl.address_line1, bl.pincode,
              b.name as business_name, b.slug as business_slug, b.average_rating, b.is_verified,
              c.name as city_name, l.name as locality_name
       FROM business_locations bl
       JOIN businesses b ON bl.business_id = b.id
       JOIN cities c ON bl.city_id = c.id
       LEFT JOIN localities l ON bl.locality_id = l.id
       WHERE b.status = 'APPROVED'`);
        const withDistance = locations
            .map((loc) => {
            const dist = (0, utils_1.calculateHaversineDistanceKm)(lat, lng, Number(loc.latitude), Number(loc.longitude));
            return {
                ...loc,
                distanceKm: dist
            };
        })
            .filter((loc) => loc.distanceKm <= radiusKm)
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, limit);
        return withDistance;
    }
    addState(name, code) {
        const existing = this.db.queryOne("SELECT id FROM states WHERE code = ?", [code]);
        if (existing)
            throw new common_1.BadRequestException(`State with code '${code}' already exists.`);
        const id = `state_${(0, utils_1.generateSlug)(code)}`;
        this.db.execute("INSERT INTO states (id, name, code, is_active) VALUES (?, ?, ?, 1)", [id, name, code.toUpperCase()]);
        return this.db.queryOne("SELECT * FROM states WHERE id = ?", [id]);
    }
    addDistrict(stateId, name) {
        const id = `dist_${(0, utils_1.generateSlug)(name)}`;
        this.db.execute("INSERT INTO districts (id, state_id, name) VALUES (?, ?, ?)", [id, stateId, name]);
        return this.db.queryOne("SELECT * FROM districts WHERE id = ?", [id]);
    }
    addCity(districtId, name, lat, lng) {
        const slug = (0, utils_1.generateSlug)(name);
        const existing = this.db.queryOne("SELECT id FROM cities WHERE slug = ?", [slug]);
        if (existing)
            throw new common_1.BadRequestException(`City with slug '${slug}' already exists.`);
        const id = `city_${slug}`;
        this.db.execute("INSERT INTO cities (id, district_id, name, slug, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)", [id, districtId, name, slug, lat, lng]);
        return this.db.queryOne("SELECT * FROM cities WHERE id = ?", [id]);
    }
    addLocality(cityId, name, pincode, lat, lng) {
        const slug = (0, utils_1.generateSlug)(name);
        const id = `loc_${slug}_${pincode}`;
        this.db.execute("INSERT INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)", [id, cityId, name, slug, pincode, lat, lng]);
        return this.db.queryOne("SELECT * FROM localities WHERE id = ?", [id]);
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map