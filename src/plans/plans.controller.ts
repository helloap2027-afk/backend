import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PlansService } from "./plans.service";

@Controller("plans")
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get("available")
  getAvailablePlans(
    @Query("role") queryRole?: string,
    @Headers("authorization") authorization?: string,
    @Headers("x-user-id") headerUserId?: string,
    @Headers("x-active-role") activeRole?: string
  ) {
    const context = this.plansService.resolveUserAndRole({
      authorization,
      userId: headerUserId,
      requestedRole: activeRole || queryRole,
    });

    const plans = this.plansService.getAvailablePlans(context.effectiveAudience);
    return {
      success: true,
      role: context.effectiveAudience,
      data: plans,
    };
  }

  @Get("faqs")
  getFaqs(
    @Query("role") queryRole?: string,
    @Headers("authorization") authorization?: string,
    @Headers("x-user-id") headerUserId?: string,
    @Headers("x-active-role") activeRole?: string
  ) {
    const context = this.plansService.resolveUserAndRole({
      authorization,
      userId: headerUserId,
      requestedRole: activeRole || queryRole,
    });

    const faqs = this.plansService.getFaqs(context.effectiveAudience);
    return {
      success: true,
      data: faqs,
    };
  }

  @Get("me")
  getMySubscription(
    @Query("businessId") queryBusinessId?: string,
    @Headers("authorization") authorization?: string,
    @Headers("x-user-id") headerUserId?: string
  ) {
    const context = this.plansService.resolveUserAndRole({
      authorization,
      userId: headerUserId,
    });

    const sub = this.plansService.getActiveSubscription(context.userId || undefined, queryBusinessId);
    return {
      success: true,
      data: sub,
    };
  }

  @Post("subscribe")
  @HttpCode(HttpStatus.OK)
  async subscribe(
    @Body()
    body: {
      planId: string;
      billingInterval?: "MONTHLY" | "YEARLY";
      userId?: string;
      userName?: string;
      userEmail?: string;
      userPhone?: string;
      businessId?: string;
      paymentMethod?: "ONLINE" | "WALLET";
      paymentReference?: string;
      paymentGateway?: string;
      idempotencyKey?: string;
    },
    @Headers("authorization") authorization?: string,
    @Headers("x-user-id") headerUserId?: string,
    @Headers("x-active-role") activeRole?: string
  ) {
    const context = this.plansService.resolveUserAndRole({
      authorization,
      userId: body.userId || headerUserId,
      requestedRole: activeRole,
    });

    return this.plansService.processSubscription(body, context);
  }
}
