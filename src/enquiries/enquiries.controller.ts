import { Controller, Post, Get, Body, Param, UseGuards, Req } from "@nestjs/common";
import { EnquiriesService } from "./enquiries.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/decorators/roles.decorator";
import { AuthService } from "../auth/auth.service";

@Controller("enquiries")
export class EnquiriesController {
  constructor(
    private readonly enquiriesService: EnquiriesService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async createEnquiry(
    @Body() body: any,
    @Req() req: any,
  ) {
    let customerId: string | undefined;

    // Optional auth extraction
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const payload = this.authService.verifyAccessToken(token);
        customerId = payload.sub;
      } catch {
        // Continue as unauthenticated customer
      }
    }

    const data = this.enquiriesService.createEnquiry({
      businessId: body.businessId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      message: body.message,
      priority: body.priority,
      customerId,
      cityName: body.cityName || body.city,
      budget: body.budget,
      consentAgreed: body.consentAgreed,
    });

    return {
      success: true,
      data,
      message: "Enquiry submitted successfully! The business owner has been notified.",
    };
  }

  @Post("instant-quote")
  async createInstantQuote(
    @Body() body: {
      customerName?: string;
      customerPhone: string;
      serviceRequired: string;
      budget?: string;
      cityName?: string;
      localityName?: string;
      categorySlug?: string;
      businessId?: string;
      consentAgreed?: boolean;
    },
  ) {
    const data = this.enquiriesService.createInstantQuote({
      customerName: body.customerName || "Customer",
      customerPhone: body.customerPhone,
      serviceRequired: body.serviceRequired,
      budget: body.budget,
      cityName: body.cityName,
      localityName: body.localityName,
      categorySlug: body.categorySlug,
      businessId: body.businessId,
      consentAgreed: body.consentAgreed,
    });

    return {
      success: true,
      data,
      message: "Instant Deal Quote dispatched successfully! Verified vendors are preparing your quotes.",
    };
  }

  @Get("my")
  @UseGuards(AuthGuard)
  getMyEnquiries(@CurrentUser() user: any) {
    const data = this.enquiriesService.getCustomerEnquiries(user.sub);
    return {
      success: true,
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get(":referenceNo")
  getEnquiryByReference(@Param("referenceNo") referenceNo: string) {
    const data = this.enquiriesService.getEnquiryByReference(referenceNo);
    return {
      success: true,
      data,
    };
  }
}

