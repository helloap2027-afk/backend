import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { BusinessesService } from "./businesses.service";
import { AuthService } from "../auth/auth.service";
import * as fs from "node:fs";

@ApiTags("Merchant")
@Controller("merchant")
export class MerchantController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly authService: AuthService
  ) {}

  private extractUserId(req: any): string {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload = this.authService.validateUserToken(token);
        if (payload?.sub) return payload.sub;
      } catch {
        // Fallback to custom user header or demo vendor
      }
    }
    const customUserId = req.headers["x-user-id"] || req.query?.userId;
    if (customUserId && typeof customUserId === "string") {
      return customUserId;
    }
    return "user-vendor-pilot";
  }

  @Get("profile")
  @ApiOperation({ summary: "Get merchant personal details, primary business, and profile status" })
  async getProfile(@Req() req: any) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.getMerchantProfile(userId);
    return { success: true, data };
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update merchant personal information" })
  async updateProfile(@Req() req: any, @Body() body: any) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.updateMerchantProfile(userId, body);
    return { success: true, data };
  }

  @Put("profile")
  @ApiOperation({ summary: "Replace merchant personal information" })
  async putProfile(@Req() req: any, @Body() body: any) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.updateMerchantProfile(userId, body);
    return { success: true, data };
  }

  @Get("profile/completion")
  @ApiOperation({ summary: "Get real dynamic completion percentage and missing fields" })
  async getProfileCompletion(@Req() req: any) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.getProfileCompletion(userId);
    return { success: true, data };
  }

  @Get("businesses")
  @ApiOperation({ summary: "Get businesses owned by the merchant" })
  async getBusinesses(@Req() req: any) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.getMerchantBusinesses(userId);
    return { success: true, data };
  }

  @Post("businesses")
  @ApiOperation({ summary: "Create a new business listing for merchant" })
  async createBusiness(@Req() req: any, @Body() body: any) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.createMerchantBusiness(userId, body);
    return { success: true, data };
  }

  @Patch("businesses/:id")
  @ApiOperation({ summary: "Update business details, address, and categories" })
  async updateBusiness(
    @Req() req: any,
    @Param("id") businessId: string,
    @Body() body: any
  ) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.updateMerchantBusiness(businessId, userId, body);
    return { success: true, data };
  }

  @Post("businesses/:id/logo")
  @ApiOperation({ summary: "Upload and update business logo" })
  async uploadLogo(
    @Req() req: any,
    @Param("id") businessId: string,
    @Body() body: { fileDataUri?: string; fileName?: string; logoUrl?: string }
  ) {
    const userId = this.extractUserId(req);
    const dataUri = body.fileDataUri || body.logoUrl || "";
    const data = this.businessesService.updateMerchantBusinessLogo(businessId, userId, dataUri);
    return { success: true, data };
  }

  @Post("businesses/:id/cover")
  @ApiOperation({ summary: "Upload and update business cover banner" })
  async uploadCover(
    @Req() req: any,
    @Param("id") businessId: string,
    @Body() body: { fileDataUri?: string; fileName?: string; coverImageUrl?: string }
  ) {
    const userId = this.extractUserId(req);
    const dataUri = body.fileDataUri || body.coverImageUrl || "";
    const data = this.businessesService.updateMerchantBusinessCover(businessId, userId, dataUri);
    return { success: true, data };
  }

  @Get("businesses/:id/documents")
  @ApiOperation({ summary: "Get uploaded KYC documents for a business" })
  async getDocuments(
    @Req() req: any,
    @Param("id") businessId: string
  ) {
    const userId = this.extractUserId(req);
    if (!this.businessesService.verifyBusinessOwnership(businessId, userId)) {
      throw new ForbiddenException("Access denied: You do not have permission to view documents for this business.");
    }
    const data = this.businessesService.getBusinessKycDocuments(businessId);
    return { success: true, data };
  }

  @Post("businesses/:id/documents")
  @ApiOperation({ summary: "Upload and save business registration proof or category license" })
  async saveDocument(
    @Req() req: any,
    @Param("id") businessId: string,
    @Body() body: any
  ) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.saveBusinessKycDocument(businessId, userId, body);
    return { success: true, data };
  }

  @Delete("businesses/:id/documents/:documentId")
  @ApiOperation({ summary: "Delete a draft or rejected document" })
  async deleteDocument(
    @Req() req: any,
    @Param("id") businessId: string,
    @Param("documentId") documentId: string
  ) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.deleteBusinessKycDocument(businessId, documentId, userId);
    return { success: true, data };
  }

  @Get("businesses/:id/documents/:documentId/file")
  @ApiOperation({ summary: "Securely view or download private KYC document file" })
  async getDocumentFile(
    @Req() req: any,
    @Res() res: any,
    @Param("id") businessId: string,
    @Param("documentId") documentId: string
  ) {
    const userId = this.extractUserId(req);
    const fileInfo = this.businessesService.getPrivateKycFile(businessId, documentId, userId);
    res.setHeader("Content-Type", fileInfo.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileInfo.fileName}"`);
    fs.createReadStream(fileInfo.filePath).pipe(res);
  }

  @Post("businesses/:id/kyc/submit")
  @ApiOperation({ summary: "Submit complete KYC dossier for Super Admin verification" })
  async submitKyc(
    @Req() req: any,
    @Param("id") businessId: string
  ) {
    const userId = this.extractUserId(req);
    const data = this.businessesService.submitBusinessKyc(businessId, userId);
    return { success: true, data };
  }
}

@ApiTags("KYC Requirements")
@Controller("kyc")
export class KycRequirementsController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get("requirements")
  @ApiOperation({ summary: "Get dynamic category-specific license rules" })
  async getRequirements(@Query("category") categorySlug?: string) {
    const data = this.businessesService.getKycRequirements(categorySlug);
    return { success: true, data };
  }
}
