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
}
