import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { calculateHaversineDistanceKm, generateSlug, isValidCoordinates, isValidPincode } from "../common/utils";

import * as crypto from "node:crypto";

export interface GeoLocationResult {
  closestCity: {
    id: string;
    name: string;
    slug: string;
    distanceKm: number;
  };
  closestLocality?: {
    id: string;
    name: string;
    slug: string;
    pincode?: string;
    distanceKm: number;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
}

@Injectable()
export class LocationsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * 1. Hierarchical Geography Navigation
   */
  getStates() {
    return this.db.query("SELECT * FROM states WHERE is_active = 1 ORDER BY name ASC");
  }

  getDistricts(stateId: string) {
    return this.db.query("SELECT * FROM districts WHERE state_id = ? ORDER BY name ASC", [stateId]);
  }

  getCities(districtId?: string) {
    if (districtId) {
      return this.db.query("SELECT * FROM cities WHERE district_id = ? AND is_active = 1 ORDER BY name ASC", [districtId]);
    }
    return this.db.query(
      `SELECT c.id, c.name, c.slug, c.latitude, c.longitude, d.name as district_name, s.name as state_name
       FROM cities c
       JOIN districts d ON c.district_id = d.id
       JOIN states s ON d.state_id = s.id
       WHERE c.is_active = 1
       ORDER BY c.name ASC`
    );
  }

  getCityBySlug(slug: string) {
    const city = this.db.queryOne("SELECT * FROM cities WHERE slug = ? AND is_active = 1", [slug]);
    if (!city) throw new NotFoundException(`City with slug '${slug}' not found.`);
    return city;
  }

  getLocalities(cityId: string) {
    return this.db.query(
      "SELECT * FROM localities WHERE city_id = ? AND is_active = 1 ORDER BY name ASC",
      [cityId]
    );
  }

  getLocalitiesByCityQuery(cityQuery: string) {
    if (!cityQuery || !cityQuery.trim()) {
      return this.db.query("SELECT * FROM localities WHERE is_active = 1 ORDER BY name ASC LIMIT 50");
    }
    const q = cityQuery.trim().toLowerCase();
    const cityRow = this.db.queryOne<any>(
      "SELECT id FROM cities WHERE LOWER(name) = ? OR LOWER(slug) = ? OR id = ?",
      [q, q, cityQuery.trim()]
    );
    if (!cityRow) {
      return this.db.query(
        "SELECT l.* FROM localities l JOIN cities c ON l.city_id = c.id WHERE LOWER(c.name) LIKE ? AND l.is_active = 1 ORDER BY l.name ASC",
        ['%' + q + '%']
      );
    }
    return this.getLocalities(cityRow.id);
  }

  /**
   * 2. PIN Code Search
   */
  lookupPincode(pincode: string) {
    if (!isValidPincode(pincode)) {
      throw new BadRequestException("PIN code must be a valid 6-digit Indian Postal Index Number.");
    }

    const localities = this.db.query<any>(
      `SELECT l.id as locality_id, l.name as locality_name, l.slug as locality_slug,
              c.id as city_id, c.name as city_name, c.slug as city_slug,
              s.name as state_name
       FROM localities l
       JOIN cities c ON l.city_id = c.id
       JOIN districts d ON c.district_id = d.id
       JOIN states s ON d.state_id = s.id
       WHERE l.pincode = ? AND l.is_active = 1`,
      [pincode]
    );

    if (localities.length === 0) {
      throw new NotFoundException(`No localities mapped to PIN code ${pincode} in active registry.`);
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

  /**
   * 3. GPS-based Reverse Geocoding & Closest Locality Matching
   */
  reverseGeocode(lat: number, lng: number): GeoLocationResult {
    if (!isValidCoordinates(lat, lng)) {
      throw new BadRequestException("Coordinates provided are outside the boundary of India.");
    }

    const allCities = this.db.query<any>("SELECT * FROM cities WHERE is_active = 1");
    if (allCities.length === 0) {
      throw new NotFoundException("No active cities available in database.");
    }

    // Compute Haversine distance to all active cities
    let closestCity = allCities[0];
    let minCityDistance = calculateHaversineDistanceKm(lat, lng, Number(closestCity.latitude), Number(closestCity.longitude));

    for (let i = 1; i < allCities.length; i++) {
      const city = allCities[i];
      const dist = calculateHaversineDistanceKm(lat, lng, Number(city.latitude), Number(city.longitude));
      if (dist < minCityDistance) {
        minCityDistance = dist;
        closestCity = city;
      }
    }

    // Now find closest locality within that city
    const localities = this.db.query<any>(
      "SELECT * FROM localities WHERE city_id = ? AND is_active = 1",
      [closestCity.id]
    );

    let closestLocality: any = null;
    let minLocDistance = Infinity;

    for (const loc of localities) {
      const dist = calculateHaversineDistanceKm(lat, lng, Number(loc.latitude), Number(loc.longitude));
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

  /**
   * 4. Distance-Based Nearby Businesses Search
   */
  findNearbyBusinesses(lat: number, lng: number, radiusKm = 10, limit = 20) {
    if (!isValidCoordinates(lat, lng)) {
      throw new BadRequestException("Invalid geographical coordinates.");
    }

    const locations = this.db.query<any>(
      `SELECT bl.business_id, bl.latitude, bl.longitude, bl.address_line1, bl.pincode,
              b.name as business_name, b.slug as business_slug, b.average_rating, b.is_verified,
              c.name as city_name, l.name as locality_name
       FROM business_locations bl
       JOIN businesses b ON bl.business_id = b.id
       JOIN cities c ON bl.city_id = c.id
       LEFT JOIN localities l ON bl.locality_id = l.id
       WHERE b.status = 'APPROVED'`
    );

    const withDistance = locations
      .map((loc) => {
        const dist = calculateHaversineDistanceKm(lat, lng, Number(loc.latitude), Number(loc.longitude));
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

  /**
   * 5. Dynamic Administrative Additions (Never Hardcoded!)
   */
  addState(name: string, code: string) {
    const existing = this.db.queryOne("SELECT id FROM states WHERE code = ?", [code]);
    if (existing) throw new BadRequestException(`State with code '${code}' already exists.`);

    const id = `state_${generateSlug(code)}`;
    this.db.execute("INSERT INTO states (id, name, code, is_active) VALUES (?, ?, ?, 1)", [id, name, code.toUpperCase()]);
    return this.db.queryOne("SELECT * FROM states WHERE id = ?", [id]);
  }

  addDistrict(stateId: string, name: string) {
    const id = `dist_${generateSlug(name)}`;
    this.db.execute("INSERT INTO districts (id, state_id, name) VALUES (?, ?, ?)", [id, stateId, name]);
    return this.db.queryOne("SELECT * FROM districts WHERE id = ?", [id]);
  }

  addCity(districtId: string, name: string, lat: number, lng: number) {
    const slug = generateSlug(name);
    const existing = this.db.queryOne("SELECT id FROM cities WHERE slug = ?", [slug]);
    if (existing) throw new BadRequestException(`City with slug '${slug}' already exists.`);

    const id = `city_${slug}`;
    this.db.execute(
      "INSERT INTO cities (id, district_id, name, slug, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [id, districtId, name, slug, lat, lng]
    );
    return this.db.queryOne("SELECT * FROM cities WHERE id = ?", [id]);
  }

  addLocality(cityId: string, name: string, pincode: string, lat: number, lng: number) {
    const slug = generateSlug(name);
    const id = `loc_${slug}_${pincode}`;
    this.db.execute(
      "INSERT INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
      [id, cityId, name, slug, pincode, lat, lng]
    );
    return this.db.queryOne("SELECT * FROM localities WHERE id = ?", [id]);
  }
}

