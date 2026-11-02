import { Controller, Get, Param, Query } from "@nestjs/common";
import { BusinessesService } from "./businesses.service";

@Controller("businesses")
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get(":slug")
  getBusinessBySlug(
    @Param("slug") slug: string,
    @Query("lat") latStr?: string,
    @Query("lng") lngStr?: string,
  ) {
    const lat = latStr ? parseFloat(latStr) : undefined;
    const lng = lngStr ? parseFloat(lngStr) : undefined;
    const data = this.businessesService.getBusinessBySlug(slug, lat, lng);
    return {
      success: true,
      data,
    };
  }
}

