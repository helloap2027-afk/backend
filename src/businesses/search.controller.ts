import { Controller, Get, Query } from "@nestjs/common";
import { BusinessesService } from "./businesses.service";

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
    @Query("lat") latStr?: string,
    @Query("lng") lngStr?: string,
    @Query("sortBy") sortBy?: "relevance" | "rating" | "distance",
    @Query("page") pageStr?: string,
    @Query("limit") limitStr?: string,
  ) {
    const minRating = minRatingStr ? parseFloat(minRatingStr) : undefined;
    const verifiedOnly = verifiedOnlyStr === "true" || verifiedOnlyStr === "1";
    const openNow = openNowStr === "true" || openNowStr === "1";
    const userLat = latStr ? parseFloat(latStr) : undefined;
    const userLng = lngStr ? parseFloat(lngStr) : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;

    const result = this.businessesService.searchBusinesses({
      q,
      citySlug: city,
      localitySlug: locality,
      categorySlug: category,
      minRating,
      verifiedOnly,
      openNow,
      userLat,
      userLng,
      sortBy,
      page,
      limit,
    });

    return {
      success: true,
      data: result.items,
      meta: result.meta,
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
}

