import { Controller, Get, Query } from "@nestjs/common";
import { BusinessesService, BusinessFilterOptions } from "./businesses.service";

@Controller("search")
export class SearchController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get("businesses")
  searchBusinesses(
    @Query("q") q?: string,
    @Query("city") city?: string,
    @Query("locality") locality?: string,
    @Query("category") category?: string,
    @Query("minRating") minRatingStr?: string,
    @Query("verifiedOnly") verifiedOnlyStr?: string,
    @Query("openNow") openNowStr?: string,
    @Query("hasOffers") hasOffersStr?: string,
    @Query("dealsOnly") dealsOnlyStr?: string,
    @Query("lat") latStr?: string,
    @Query("lng") lngStr?: string,
    @Query("latitude") latitudeStr?: string,
    @Query("longitude") longitudeStr?: string,
    @Query("radiusKm") radiusKmStr?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sort") sort?: string,
    @Query("page") pageStr?: string,
    @Query("limit") limitStr?: string,
  ) {
    const minRating = minRatingStr ? parseFloat(minRatingStr) : undefined;
    const verifiedOnly = verifiedOnlyStr === "true" || verifiedOnlyStr === "1";
    const openNow = openNowStr === "true" || openNowStr === "1";
    const hasOffers =
      hasOffersStr === "true" ||
      hasOffersStr === "1" ||
      dealsOnlyStr === "true" ||
      dealsOnlyStr === "1";

    const userLat = latStr ? parseFloat(latStr) : latitudeStr ? parseFloat(latitudeStr) : undefined;
    const userLng = lngStr ? parseFloat(lngStr) : longitudeStr ? parseFloat(longitudeStr) : undefined;
    const radiusKm = radiusKmStr ? parseFloat(radiusKmStr) : undefined;

    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const effectiveSortBy = (sortBy || sort || "relevance") as BusinessFilterOptions["sortBy"];

    const result = this.businessesService.searchBusinesses({
      q,
      citySlug: city,
      localitySlug: locality,
      categorySlug: category,
      minRating,
      verifiedOnly,
      openNow,
      hasOffers,
      userLat,
      userLng,
      radiusKm,
      sortBy: effectiveSortBy,
      page,
      limit,
    });

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      appliedFilters: {
        q: q || null,
        city: city || null,
        locality: locality || null,
        category: category || null,
        minRating: minRating ?? null,
        verifiedOnly,
        openNow,
        hasOffers,
        sortBy: effectiveSortBy,
      },
    };
  }

  @Get("suggest")
  getSuggestions(@Query("q") q: string, @Query("city") city?: string) {
    const data = this.businessesService.getSuggestions(q || "", city);
    return {
      success: true,
      data,
    };
  }

  // Alias /suggestions for standard enterprise REST conventions
  @Get("suggestions")
  getSuggestionsAlias(@Query("q") q: string, @Query("city") city?: string) {
    const data = this.businessesService.getSuggestions(q || "", city);
    return {
      success: true,
      data,
    };
  }
}
