import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface BusinessFilterOptions {
  q?: string;
  citySlug?: string;
  localitySlug?: string;
  categorySlug?: string;
  minRating?: number;
  verifiedOnly?: boolean;
  openNow?: boolean;
  userLat?: number;
  userLng?: number;
  sortBy?: "relevance" | "rating" | "distance";
  page?: number;
  limit?: number;
}

@Injectable()
export class BusinessesService {
  constructor(private readonly db: DatabaseService) {}

  private computeHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private checkIsOpenNow(hours: Array<{ day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: number }>): {
    isOpenNow: boolean;
    todaySummary: string;
  } {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday
    const currentHour = String(now.getHours()).padStart(2, "0");
    const currentMin = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${currentHour}:${currentMin}`;

    const todayHour = hours.find((h) => h.day_of_week === currentDay);
    if (!todayHour || todayHour.is_closed === 1 || !todayHour.opens_at || !todayHour.closes_at) {
      return {
        isOpenNow: false,
        todaySummary: "Closed today",
      };
    }

    const isOpen = currentTime >= todayHour.opens_at && currentTime <= todayHour.closes_at;
    return {
      isOpenNow: isOpen,
      todaySummary: `${isOpen ? "Open today" : "Closed now"} (${todayHour.opens_at} - ${todayHour.closes_at})`,
    };
  }

  searchBusinesses(filters: BusinessFilterOptions) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(50, filters.limit || 10));
    const offset = (page - 1) * limit;

    let baseSql = `
      SELECT 
        b.id, b.name, b.slug, b.description, b.primary_phone as primaryPhone,
        b.whatsapp_number as whatsappNumber, b.logo_url as logoUrl,
        b.cover_image_url as coverImageUrl, b.is_verified as isVerified,
        b.is_featured as isFeatured, b.average_rating as averageRating,
        b.total_reviews as totalReviews, b.total_enquiries as totalEnquiries,
        c.name as cityName, c.slug as citySlug,
        l.name as localityName, l.slug as localitySlug, l.pincode,
        bl.address_line1 as addressLine1, bl.landmark,
        bl.latitude, bl.longitude,
        cat.id as categoryId, cat.name as categoryName, cat.slug as categorySlug
      FROM businesses b
      JOIN business_locations bl ON bl.business_id = b.id AND bl.is_primary = 1
      JOIN cities c ON c.id = bl.city_id
      LEFT JOIN localities l ON l.id = bl.locality_id
      JOIN business_categories bc ON bc.business_id = b.id AND bc.is_primary = 1
      JOIN categories cat ON cat.id = bc.category_id
      WHERE b.status = 'APPROVED'
    `;

    const params: any[] = [];

    if (filters.q && filters.q.trim()) {
      const searchTerm = `%${filters.q.trim().toLowerCase()}%`;
      baseSql += ` AND (
        LOWER(b.name) LIKE ? OR 
        LOWER(b.description) LIKE ? OR 
        LOWER(cat.name) LIKE ? OR
        EXISTS (
          SELECT 1 FROM services s 
          WHERE s.category_id = cat.id AND LOWER(s.name) LIKE ?
        )
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.citySlug) {
      baseSql += ` AND c.slug = ?`;
      params.push(filters.citySlug.toLowerCase());
    }

    if (filters.localitySlug) {
      baseSql += ` AND l.slug = ?`;
      params.push(filters.localitySlug.toLowerCase());
    }

    if (filters.categorySlug) {
      const catSlug = filters.categorySlug.toLowerCase();
      const aliasMap: Record<string, string[]> = {
        "restaurants": ["restaurants", "restaurants-food", "cat-restaurants", "cat-food"],
        "restaurants-food": ["restaurants", "restaurants-food", "cat-restaurants", "cat-food"],
        "dentists": ["dentists", "dental-care", "cat-dentists", "cat-dental"],
        "dental-care": ["dentists", "dental-care", "cat-dentists", "cat-dental"],
        "rent-hire": ["rent-hire", "cat-rent-hire", "packers-movers", "cat-movers", "tours-travel", "cat-tours"],
        "contractors": ["contractors", "cat-contractors", "electrical-plumbing", "cat-electric"],
        "hospitals": ["hospitals", "cat-hospitals", "doctors-clinics", "cat-doctors"],
        "beauty-spa": ["beauty-spa", "cat-beauty-spa"],
        "home-decor": ["home-decor", "cat-home-decor", "home-services", "cat-home"],
        "ask-astro": ["ask-astro", "cat-ask-astro"],
        "wedding-planning": ["wedding-planning", "cat-wedding-planning"],
        "education": ["education", "cat-education"],
        "pet-shops": ["pet-shops", "cat-pet-shops"],
        "pg-hostels": ["pg-hostels", "cat-pg-hostels"],
        "estate-agent": ["estate-agent", "cat-estate-agent"],
        "hotels": ["hotels", "cat-hotels"],
      };

      const targetMatches = aliasMap[catSlug] || [catSlug, `cat-${catSlug}`];
      const placeholders = targetMatches.map(() => "?").join(", ");
      baseSql += ` AND (cat.slug IN (${placeholders}) OR cat.id IN (${placeholders}))`;
      params.push(...targetMatches, ...targetMatches);
    }

    if (filters.minRating) {
      baseSql += ` AND b.average_rating >= ?`;
      params.push(filters.minRating);
    }

    if (filters.verifiedOnly) {
      baseSql += ` AND b.is_verified = 1`;
    }

    const allRows = this.db.query<any>(baseSql, params);

    // Enrich rows with distance and real-time open status
    const enriched = allRows.map((row) => {
      let distanceKm: number | undefined;
      if (filters.userLat && filters.userLng) {
        distanceKm = this.computeHaversineDistanceKm(
          filters.userLat,
          filters.userLng,
          row.latitude,
          row.longitude
        );
      }

      // Fetch hours
      const hours = this.db.query<any>(
        `SELECT day_of_week, opens_at, closes_at, is_closed FROM business_hours WHERE business_id = ?`,
        [row.id]
      );
      const { isOpenNow, todaySummary } = this.checkIsOpenNow(hours);

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        logoUrl: row.logoUrl,
        coverImageUrl: row.coverImageUrl,
        isVerified: Boolean(row.isVerified),
        isFeatured: Boolean(row.isFeatured),
        isOpenNow,
        workingHoursSummary: todaySummary,
        averageRating: Number(row.averageRating),
        totalReviews: Number(row.totalReviews),
        totalEnquiries: Number(row.totalEnquiries),
        primaryCategory: {
          id: row.categoryId,
          name: row.categoryName,
          slug: row.categorySlug,
        },
        location: {
          addressLine1: row.addressLine1,
          landmark: row.landmark,
          localityName: row.localityName || "",
          localitySlug: row.localitySlug || "",
          cityName: row.cityName,
          citySlug: row.citySlug,
          pincode: row.pincode,
          distanceKm,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
        },
        contacts: {
          callNumber: row.primaryPhone,
          whatsappNumber: row.whatsappNumber,
        },
      };
    });

    // Filter by openNow if requested
    let filtered = enriched;
    if (filters.openNow) {
      filtered = filtered.filter((item) => item.isOpenNow);
    }

    // Sort
    if (filters.sortBy === "distance" && filters.userLat && filters.userLng) {
      filtered.sort((a, b) => (a.location.distanceKm ?? 99999) - (b.location.distanceKm ?? 99999));
    } else if (filters.sortBy === "rating") {
      filtered.sort((a, b) => b.averageRating - a.averageRating);
    } else {
      // Default: featured first, then rating, then enquiries
      filtered.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
        return b.totalEnquiries - a.totalEnquiries;
      });
    }

    const totalRecords = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      meta: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        hasNextPage: page * limit < totalRecords,
      },
    };
  }

  getBusinessBySlug(slugOrId: string, userLat?: number, userLng?: number) {
    const biz = this.db.queryOne<any>(`
      SELECT 
        b.id, b.name, b.legal_name as legalName, b.slug, b.description,
        b.primary_phone as primaryPhone, b.whatsapp_number as whatsappNumber,
        b.support_email as supportEmail, b.logo_url as logoUrl,
        b.cover_image_url as coverImageUrl, b.status, b.is_verified as isVerified,
        b.is_featured as isFeatured, b.average_rating as averageRating,
        b.total_reviews as totalReviews, b.total_enquiries as totalEnquiries,
        b.created_at as createdAt
      FROM businesses b
      WHERE (b.slug = ? OR b.id = ?) AND b.status = 'APPROVED'
    `, [slugOrId, slugOrId]);

    if (!biz) {
      throw new NotFoundException(`Business '${slugOrId}' not found`);
    }

    // Locations
    const locations = this.db.query<any>(`
      SELECT 
        bl.id, bl.address_line1 as addressLine1, bl.landmark, bl.pincode,
        bl.latitude, bl.longitude, bl.is_primary as isPrimary,
        c.id as cityId, c.name as cityName, c.slug as citySlug,
        l.id as localityId, l.name as localityName, l.slug as localitySlug
      FROM business_locations bl
      JOIN cities c ON c.id = bl.city_id
      LEFT JOIN localities l ON l.id = bl.locality_id
      WHERE bl.business_id = ?
      ORDER BY bl.is_primary DESC
    `, [biz.id]);

    const primaryLoc = locations[0];
    let distanceKm: number | undefined;
    if (userLat && userLng && primaryLoc) {
      distanceKm = this.computeHaversineDistanceKm(
        userLat,
        userLng,
        primaryLoc.latitude,
        primaryLoc.longitude
      );
    }

    // Categories
    const categories = this.db.query<any>(`
      SELECT c.id, c.name, c.slug, c.icon_name as iconName, bc.is_primary as isPrimary
      FROM business_categories bc
      JOIN categories c ON c.id = bc.category_id
      WHERE bc.business_id = ?
      ORDER BY bc.is_primary DESC
    `, [biz.id]);

    // Working Hours
    const hours = this.db.query<any>(`
      SELECT day_of_week as dayOfWeek, opens_at as opensAt, closes_at as closesAt, is_closed as isClosed
      FROM business_hours
      WHERE business_id = ?
      ORDER BY day_of_week ASC
    `, [biz.id]);

    const { isOpenNow, todaySummary } = this.checkIsOpenNow(
      hours.map((h: any) => ({
        day_of_week: h.dayOfWeek,
        opens_at: h.opensAt,
        closes_at: h.closesAt,
        is_closed: h.isClosed,
      }))
    );

    // Media
    const media = this.db.query<any>(`
      SELECT id, media_url as mediaUrl, media_type as mediaType, sort_order as sortOrder
      FROM business_media
      WHERE business_id = ?
      ORDER BY sort_order ASC
    `, [biz.id]);

    // Reviews
    const reviews = this.db.query<any>(`
      SELECT 
        r.id, r.rating, r.review_text as reviewText, r.created_at as createdAt,
        u.full_name as authorName, u.avatar_url as authorAvatar
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.business_id = ? AND r.status = 'APPROVED'
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [biz.id]);

    return {
      id: biz.id,
      name: biz.name,
      legalName: biz.legalName,
      slug: biz.slug,
      description: biz.description,
      logoUrl: biz.logoUrl,
      coverImageUrl: biz.coverImageUrl,
      isVerified: Boolean(biz.isVerified),
      isFeatured: Boolean(biz.isFeatured),
      isOpenNow,
      workingHoursSummary: todaySummary,
      averageRating: Number(biz.averageRating),
      totalReviews: Number(biz.totalReviews),
      totalEnquiries: Number(biz.totalEnquiries),
      contacts: {
        primaryPhone: biz.primaryPhone,
        whatsappNumber: biz.whatsappNumber,
        supportEmail: biz.supportEmail,
      },
      locations: locations.map((loc) => ({
        ...loc,
        isPrimary: Boolean(loc.isPrimary),
        distanceKm,
      })),
      categories: categories.map((cat) => ({
        ...cat,
        isPrimary: Boolean(cat.isPrimary),
      })),
      hours,
      media,
      reviews,
    };
  }

  getSuggestions(query: string, citySlug?: string) {
    if (!query || query.trim().length < 2) {
      return { businesses: [], categories: [], localities: [] };
    }

    const term = `%${query.trim().toLowerCase()}%`;

    const businesses = this.db.query<any>(`
      SELECT b.id, b.name, b.slug, c.name as cityName
      FROM businesses b
      JOIN business_locations bl ON bl.business_id = b.id AND bl.is_primary = 1
      JOIN cities c ON c.id = bl.city_id
      WHERE b.status = 'APPROVED' AND LOWER(b.name) LIKE ?
      LIMIT 5
    `, [term]);

    const categories = this.db.query<any>(`
      SELECT id, name, slug, icon_name as iconName
      FROM categories
      WHERE is_active = 1 AND LOWER(name) LIKE ?
      LIMIT 5
    `, [term]);

    const localities = this.db.query<any>(`
      SELECT l.id, l.name, l.slug, c.name as cityName, c.slug as citySlug
      FROM localities l
      JOIN cities c ON c.id = l.city_id
      WHERE l.is_active = 1 AND LOWER(l.name) LIKE ?
      LIMIT 5
    `, [term]);

    return {
      businesses,
      categories,
      localities,
    };
  }

  /**
   * Register a new vendor business (multistep onboarding)
   */
  registerVendorBusiness(userId: string, data: any) {
    if (!data.name || !data.categoryId || !data.cityId) {
      throw new Error("Business name, primary category, and city are required.");
    }

    const now = new Date().toISOString();
    const businessId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const baseSlug = (data.name as string)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    // 1. Insert Business
    const primaryPhone = data.primaryPhone || data.phone || "+919848012345";
    this.db.execute(`
      INSERT INTO businesses (id, name, legal_name, slug, description, primary_phone, whatsapp_number, support_email, is_verified, status, average_rating, total_reviews, total_enquiries, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING', 0.0, 0, 0, ?, ?)
    `, [
      businessId,
      data.name,
      data.legalName || data.name,
      slug,
      data.description || null,
      primaryPhone,
      data.whatsappNumber || primaryPhone,
      data.supportEmail || null,
      now,
      now
    ]);

    // 2. Insert Business Location
    const locId = `loc_${Date.now()}`;
    const lat = data.latitude ? parseFloat(data.latitude) : 16.5062;
    const lng = data.longitude ? parseFloat(data.longitude) : 80.6480;

    this.db.execute(`
      INSERT INTO business_locations (id, business_id, city_id, locality_id, address_line1, landmark, pincode, latitude, longitude, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      locId,
      businessId,
      data.cityId,
      data.localityId || null,
      data.addressLine1 || data.name,
      data.landmark || null,
      data.pincode || "520001",
      lat,
      lng
    ]);

    // 3. Link Category
    const catLinkId = `bcat_${Date.now()}`;
    this.db.execute(`
      INSERT INTO business_categories (id, business_id, category_id, is_primary)
      VALUES (?, ?, ?, 1)
    `, [catLinkId, businessId, data.categoryId]);

    // 4. Link Ownership
    const ownerLinkId = `bo_${Date.now()}`;
    this.db.execute(`
      INSERT INTO business_owners (id, business_id, user_id, ownership_type)
      VALUES (?, ?, ?, 'PRIMARY_OWNER')
    `, [ownerLinkId, businessId, userId]);

    // 5. Assign VENDOR_OWNER role if not already assigned
    const vendorRole = this.db.queryOne<any>("SELECT id FROM roles WHERE name = 'VENDOR_OWNER'");
    if (vendorRole) {
      const existingPerm = this.db.queryOne<any>(
        "SELECT id FROM user_permissions WHERE user_id = ? AND role_id = ?",
        [userId, vendorRole.id]
      );
      if (!existingPerm) {
        this.db.execute(`
          INSERT INTO user_permissions (id, user_id, role_id)
          VALUES (?, ?, ?)
        `, [`perm_${Date.now()}`, userId, vendorRole.id]);
      }
    }

    // 6. Notify Super Admin
    this.db.execute(`
      INSERT INTO notifications (id, title, message, type, recipient, is_read, related_entity, related_id, created_at)
      VALUES (?, ?, ?, 'KYC_VERIFICATION', 'Super Admin', 0, 'businesses', ?, ?)
    `, [
      `notif_${Date.now()}`,
      `New Vendor Registration: ${data.name}`,
      `A new business "${data.name}" has been registered by vendor and is awaiting verification.`,
      businessId,
      now
    ]);

    return {
      businessId,
      name: data.name,
      slug,
      status: "PENDING",
      isVerified: false,
      message: "Business registered successfully and submitted for administrator verification."
    };
  }

  /**
   * Get registration status for user's owned businesses
   */
  getVendorRegistrationStatus(userId: string) {
    return this.db.query<any>(`
      SELECT b.id, b.name, b.slug, b.status, b.is_verified as isVerified, b.created_at as createdAt,
             c.name as cityName, cat.name as categoryName
      FROM business_owners bo
      JOIN businesses b ON bo.business_id = b.id
      LEFT JOIN business_locations bl ON bl.business_id = b.id AND bl.is_primary = 1
      LEFT JOIN cities c ON c.id = bl.city_id
      LEFT JOIN business_categories bc ON bc.business_id = b.id AND bc.is_primary = 1
      LEFT JOIN categories cat ON cat.id = bc.category_id
      WHERE bo.user_id = ?
      ORDER BY b.created_at DESC
    `, [userId]);
  }

  /**
   * Add Your Business Free — stores in real DB and returns mapped BusinessItemCard
   */
  createFreeBusinessListing(data: any) {
    if (!data.name || !data.name.trim()) {
      throw new Error("Business name is required.");
    }

    const now = new Date().toISOString();
    const businessId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const baseSlug = (data.name as string)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

    // 1. Resolve City
    const cityInput = (data.city || "Hyderabad").toString().trim().toLowerCase();
    let cityRow = this.db.queryOne<any>(
      "SELECT id, name, slug, latitude, longitude FROM cities WHERE LOWER(name) = ? OR LOWER(slug) = ?",
      [cityInput, cityInput]
    );
    if (!cityRow) {
      cityRow = { id: "city-hyd", name: "Hyderabad", slug: "hyderabad", latitude: 17.4435, longitude: 78.3772 };
    }

    // 2. Resolve or Create Locality
    const localityInput = (data.locality || "Hitec City").toString().trim();
    const locSlug = localityInput.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let locRow = this.db.queryOne<any>(
      "SELECT id, name, slug, pincode, latitude, longitude FROM localities WHERE city_id = ? AND (LOWER(name) = LOWER(?) OR LOWER(slug) = LOWER(?))",
      [cityRow.id, localityInput, locSlug]
    );

    if (!locRow) {
      const locId = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const lat = cityRow.latitude + (Math.random() - 0.5) * 0.04;
      const lng = cityRow.longitude + (Math.random() - 0.5) * 0.04;
      const pincode = data.pincode || (cityRow.slug === "hyderabad" ? "500081" : cityRow.slug === "vijayawada" ? "520008" : "522002");
      this.db.execute(
        "INSERT INTO localities (id, city_id, name, slug, pincode, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
        [locId, cityRow.id, localityInput, locSlug, pincode, lat, lng]
      );
      locRow = { id: locId, name: localityInput, slug: locSlug, pincode, latitude: lat, longitude: lng };
    }

    // 3. Resolve Category
    const categoryInput = (data.category || data.categorySlug || "restaurants").toString().trim().toLowerCase();
    let catRow = this.db.queryOne<any>(
      "SELECT id, name, slug FROM categories WHERE LOWER(slug) = ? OR LOWER(id) = ? OR LOWER(name) = ?",
      [categoryInput, categoryInput, categoryInput]
    );
    if (!catRow) {
      const aliasMatch: Record<string, string> = {
        "restaurants-food": "restaurants",
        "dental-care": "dentists",
        "electrical-plumbing": "contractors",
        "packers-movers": "rent-hire",
        "tours-travel": "rent-hire",
        "home-services": "home-decor",
        "doctors-clinics": "hospitals",
      };
      const mappedSlug = aliasMatch[categoryInput] || "restaurants";
      catRow = this.db.queryOne<any>(
        "SELECT id, name, slug FROM categories WHERE LOWER(slug) = ? OR LOWER(id) = ?",
        [mappedSlug, `cat-${mappedSlug}`]
      );
    }
    if (!catRow) {
      catRow = { id: "cat-restaurants", name: "Restaurants", slug: "restaurants" };
    }

    // 4. Default Category Cover Photos
    const categoryCoverMap: Record<string, string> = {
      "restaurants": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
      "hotels": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80",
      "beauty-spa": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
      "home-decor": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80",
      "ask-astro": "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80",
      "wedding-planning": "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80",
      "education": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80",
      "rent-hire": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80",
      "hospitals": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop&q=80",
      "contractors": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80",
      "pet-shops": "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80",
      "pg-hostels": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=80",
      "estate-agent": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80",
      "dentists": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80",
    };

    const coverImageUrl = (data.coverPhoto || data.coverImageUrl || data.imageUrl || data.image || "").toString().trim() || categoryCoverMap[catRow.slug] || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80";
    const primaryPhone = data.phone || data.primaryPhone || "+91 98480 22334";
    const whatsappNumber = data.whatsapp || primaryPhone;
    const supportEmail = data.email || "partner@business.in";
    const description = data.description || `${data.name} is a premier verified provider in ${locRow.name}, ${cityRow.name}. Contact for immediate services and bookings.`;

    // 5. Insert into businesses table with APPROVED status
    this.db.execute(`
      INSERT INTO businesses (
        id, name, legal_name, slug, description, primary_phone, whatsapp_number, support_email,
        logo_url, cover_image_url, status, is_verified, verified_at, is_featured,
        average_rating, total_reviews, total_enquiries, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 1, ?, 1, 4.9, 1, 0, ?, ?)
    `, [
      businessId,
      data.name,
      data.legalName || data.name,
      slug,
      description,
      primaryPhone,
      whatsappNumber,
      supportEmail,
      coverImageUrl,
      coverImageUrl,
      now,
      now,
      now,
    ]);

    // 6. Insert primary location
    const locLinkId = `bloc_${Date.now()}`;
    const addressLine1 = data.address || `${locRow.name}, ${cityRow.name}`;
    const landmark = data.landmark || "";
    const pincode = locRow.pincode || "500081";

    this.db.execute(`
      INSERT INTO business_locations (
        id, business_id, city_id, locality_id, address_line1, landmark, pincode, latitude, longitude, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      locLinkId,
      businessId,
      cityRow.id,
      locRow.id,
      addressLine1,
      landmark,
      pincode,
      locRow.latitude,
      locRow.longitude,
    ]);

    // 7. Insert primary category
    const catLinkId = `bcat_${Date.now()}`;
    this.db.execute(`
      INSERT INTO business_categories (id, business_id, category_id, is_primary)
      VALUES (?, ?, ?, 1)
    `, [catLinkId, businessId, catRow.id]);

    // 8. Insert working hours for all days
    const opensAt = data.opensAt || "09:00 AM";
    const closesAt = data.closesAt || "09:30 PM";
    for (let day = 0; day <= 6; day++) {
      this.db.execute(`
        INSERT INTO business_hours (id, business_id, day_of_week, opens_at, closes_at, is_closed)
        VALUES (?, ?, ?, ?, ?, 0)
      `, [`bhr_${businessId}_${day}`, businessId, day, opensAt, closesAt]);
    }

    // 9. Return full BusinessItemCard response object
    return {
      id: businessId,
      name: data.name,
      slug,
      description,
      coverImageUrl,
      isVerified: true,
      isOpenNow: true,
      averageRating: 4.9,
      totalReviews: 1,
      totalEnquiries: 0,
      dealOffer: "Verified Member • Instant Fast Quote",
      priceForTwoOrConsultation: "Free Quote / Instant Inquiry",
      primaryCategory: {
        id: catRow.id,
        name: catRow.name,
        slug: catRow.slug,
      },
      location: {
        addressLine1,
        landmark,
        localityName: locRow.name,
        localitySlug: locRow.slug,
        cityName: cityRow.name,
        citySlug: cityRow.slug,
        pincode,
        distanceKm: 0.8,
        latitude: locRow.latitude,
        longitude: locRow.longitude,
      },
      contacts: {
        callNumber: primaryPhone,
        whatsappNumber,
      },
    };
  }
}
