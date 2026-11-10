import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Headers, 
  Req, 
  HttpCode, 
  HttpStatus, 
  BadRequestException,
  UnauthorizedException 
} from "@nestjs/common";
import { PaymentsService, CreateOrderInput } from "./payments.service";
import { AuthService } from "../auth/auth.service";

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly authService: AuthService
  ) {}

  private extractUser(req: any): { userId: string; role: "CUSTOMER" | "MERCHANT" } {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = this.authService.validateUserToken(token);
      const isMerchant = payload.roles?.some((r: string) => 
        ["VENDOR_OWNER", "VENDOR_MANAGER", "VENDOR_STAFF", "BUSINESS_PARTNER"].includes(r)
      );
      return {
        userId: payload.sub,
        role: isMerchant ? "MERCHANT" : "CUSTOMER",
      };
    }

    // Dev fallback
    const devUserId = req.headers["x-user-id"];
    const devRole = req.headers["x-user-role"] === "MERCHANT" ? "MERCHANT" : "CUSTOMER";
    if (process.env.NODE_ENV !== "production" && devUserId) {
      return {
        userId: devUserId,
        role: devRole,
      };
    }

    throw new UnauthorizedException("Authentication required to initiate payment order");
  }

  /**
   * 1. Create a payment order with Idempotency Key
   */
  @Post("create-order")
  @HttpCode(HttpStatus.OK)
  createOrder(
    @Req() req: any,
    @Body() body: {
      purpose: "WALLET_TOPUP" | "SUBSCRIPTION_PLAN" | "LEAD_PURCHASE" | "BOOKING";
      amountRupees: number;
      currency?: string;
      idempotencyKey: string;
      metadata?: Record<string, any>;
    }
  ) {
    const user = this.extractUser(req);
    return {
      success: true,
      data: this.paymentsService.createOrder({
        userId: user.userId,
        userType: user.role,
        purpose: body.purpose,
        amountRupees: body.amountRupees,
        currency: body.currency,
        idempotencyKey: body.idempotencyKey,
        metadata: body.metadata,
      }),
    };
  }

  /**
   * 2. Authoritative Order Status Polling & Recovery
   */
  @Get("status/:orderId")
  getOrderStatus(@Param("orderId") orderId: string, @Req() req: any) {
    let userId: string | undefined = undefined;
    try {
      const user = this.extractUser(req);
      userId = user.userId;
    } catch {}

    const status = this.paymentsService.getOrderStatus(orderId, userId);
    return {
      success: true,
      data: status,
    };
  }

  /**
   * 3. Payment Gateway Webhook Receiver
   */
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: any,
    @Headers("x-razorpay-signature") signature: string,
    @Body() body: any
  ) {
    const rawPayload = typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(body);
    const result = this.paymentsService.processWebhook(rawPayload, signature, body);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 4. Sandbox Test Simulator
   */
  @Post("sandbox/simulate")
  @HttpCode(HttpStatus.OK)
  simulateSandbox(
    @Body() body: {
      orderId: string;
      action: "SUCCESS" | "FAIL" | "TIMEOUT" | "CANCEL";
      failureReason?: string;
    }
  ) {
    if (!body.orderId || !body.action) {
      throw new BadRequestException("orderId and action (SUCCESS/FAIL/TIMEOUT/CANCEL) are required");
    }
    const result = this.paymentsService.simulateGatewaySandboxResponse(body.orderId, body.action, body.failureReason);
    return {
      success: true,
      data: result,
    };
  }
}

