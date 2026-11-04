import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { BusinessesService } from "./businesses.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/decorators/roles.decorator";

class VendorRegistrationDto {
  name!: string;
  categoryId!: string;
  cityId!: string;
  localityId?: string;
  addressLine1?: string;
  landmark?: string;
  pincode?: string;
  description?: string;
  website?: string;
  gstin?: string;
  latitude?: number;
  longitude?: number;
}

@ApiTags("Vendors")
@Controller("vendors")
export class VendorsController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post("registration")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Submit multistep business registration for verification" })
  @ApiResponse({ status: 201, description: "Business registration submitted" })
  async registerBusiness(
    @CurrentUser("sub") userId: string,
    @Body() body: VendorRegistrationDto
  ) {
    const data = this.businessesService.registerVendorBusiness(userId, body);
    return {
      success: true,
      data
    };
  }

  @Get("registration/status")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get registration status for user's owned businesses" })
  async getRegistrationStatus(@CurrentUser("sub") userId: string) {
    const data = this.businessesService.getVendorRegistrationStatus(userId);
    return {
      success: true,
      data
    };
  }
}
