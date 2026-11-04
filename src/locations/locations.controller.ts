import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { LocationsService } from "./locations.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

class CreateStateDto {
  name!: string;
  code!: string;
}

class CreateCityDto {
  districtId!: string;
  name!: string;
  latitude!: number;
  longitude!: number;
}

class CreateLocalityDto {
  cityId!: string;
  name!: string;
  pincode!: string;
  latitude!: number;
  longitude!: number;
}

@ApiTags("Locations")
@Controller("locations")
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get("states")
  @ApiOperation({ summary: "List all active Indian states" })
  getStates() {
    return {
      success: true,
      data: this.locationsService.getStates()
    };
  }

  @Get("states/:stateId/districts")
  @ApiOperation({ summary: "List districts for given state" })
  getDistricts(@Param("stateId") stateId: string) {
    return {
      success: true,
      data: this.locationsService.getDistricts(stateId)
    };
  }

  @Get("cities")
  @ApiOperation({ summary: "List all active cities with coordinates" })
  getCities(@Query("districtId") districtId?: string) {
    return {
      success: true,
      data: this.locationsService.getCities(districtId)
    };
  }

  @Get("cities/:cityId/localities")
  @ApiOperation({ summary: "List all active localities within a city" })
  getLocalities(@Param("cityId") cityId: string) {
    return {
      success: true,
      data: this.locationsService.getLocalities(cityId)
    };
  }

  @Get("localities")
  @ApiOperation({ summary: "List all active localities by city query (name, id, or slug)" })
  getLocalitiesByQuery(@Query("city") city?: string, @Query("cityId") cityId?: string) {
    return {
      success: true,
      data: this.locationsService.getLocalitiesByCityQuery(city || cityId || "")
    };
  }

  @Get("pincode/:pincode")
  @ApiOperation({ summary: "Lookup city and localities by 6-digit Indian PIN code" })
  lookupPincode(@Param("pincode") pincode: string) {
    return {
      success: true,
      data: this.locationsService.lookupPincode(pincode)
    };
  }

  @Get("reverse-geocode")
  @ApiOperation({ summary: "GPS reverse-geocoding: resolve closest city and locality" })
  reverseGeocode(@Query("lat") lat: string, @Query("lng") lng: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    return {
      success: true,
      data: this.locationsService.reverseGeocode(latitude, longitude)
    };
  }

  @Get("nearby-businesses")
  @ApiOperation({ summary: "Find nearby businesses within radius km of coordinates" })
  findNearby(
    @Query("lat") lat: string,
    @Query("lng") lng: string,
    @Query("radiusKm") radiusKm?: string
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = radiusKm ? parseFloat(radiusKm) : 10;
    return {
      success: true,
      data: this.locationsService.findNearbyBusinesses(latitude, longitude, radius)
    };
  }

  // --- Dynamic Administrative Endpoints (RBAC Enforced) ---

  @Post("admin/states")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Dynamically add a new state (Admin only)" })
  addState(@Body() body: CreateStateDto) {
    return {
      success: true,
      data: this.locationsService.addState(body.name, body.code)
    };
  }

  @Post("admin/cities")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Dynamically add a new city (Admin only)" })
  addCity(@Body() body: CreateCityDto) {
    return {
      success: true,
      data: this.locationsService.addCity(body.districtId, body.name, body.latitude, body.longitude)
    };
  }

  @Post("admin/localities")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Dynamically add a new locality (Admin only)" })
  addLocality(@Body() body: CreateLocalityDto) {
    return {
      success: true,
      data: this.locationsService.addLocality(body.cityId, body.name, body.pincode, body.latitude, body.longitude)
    };
  }
}

