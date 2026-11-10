import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Req, 
  UseGuards, 
  UnauthorizedException,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common";
import { WalletLedgerService } from "./wallet-ledger.service";
import { AuthService } from "../auth/auth.service";

@Controller("wallet")
export class WalletController {
  constructor(
    private readonly walletService: WalletLedgerService,
    private readonly authService: AuthService
  ) {}

  private extractUser(req: any): { userId: string; role: "CUSTOMER" | "MERCHANT"; roles: string[] } {
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
        roles: payload.roles || [],
      };
    }

    // Dev fallback for local preview testing
    const devUserId = req.headers["x-user-id"];
    const devRole = req.headers["x-user-role"] === "MERCHANT" ? "MERCHANT" : "CUSTOMER";
    if (process.env.NODE_ENV !== "production" && devUserId) {
      return {
        userId: devUserId,
        role: devRole,
        roles: [devRole === "MERCHANT" ? "VENDOR_OWNER" : "CUSTOMER"],
      };
    }

    throw new UnauthorizedException("Authentication token required to access wallet");
  }

  @Get("me")
  getMyWallet(@Req() req: any) {
    const { userId, role } = this.extractUser(req);
    const wallet = this.walletService.getOrCreateWallet(userId, role);
    return {
      success: true,
      data: wallet,
    };
  }

  @Get("me/summary")
  getMyWalletSummary(@Req() req: any) {
    const { userId, role } = this.extractUser(req);
    const summary = this.walletService.getWalletSummary(userId, role);
    return {
      success: true,
      data: summary,
    };
  }

  @Get("me/transactions")
  getMyTransactions(
    @Req() req: any,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("category") category?: string
  ) {
    const { userId, role } = this.extractUser(req);
    const res = this.walletService.getUserTransactions(userId, role, {
      page,
      pageSize,
      type,
      status,
      search,
      category,
    });
    return {
      success: true,
      data: res.data,
      pagination: res.pagination,
    };
  }

  @Post("me/topup")
  topupMyWallet(@Req() req: any, @Body() body: { amount: number; paymentMethod?: string; externalRef?: string }) {
    const { userId, role } = this.extractUser(req);
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException("Top-up amount must be greater than zero");
    }

    const res = this.walletService.creditWallet({
      userId,
      userType: role,
      amount: body.amount,
      category: "TOPUP",
      reason: `Wallet Top-up via ${body.paymentMethod || "UPI/Card"}`,
      adminId: "SELF",
      adminRemarks: "User initiated top-up",
      externalRef: body.externalRef || `TOPUP_${Date.now()}`,
      idempotencyKey: `topup_${userId}_${Date.now()}`,
    });

    return {
      success: true,
      data: res,
      message: `₹${body.amount.toFixed(2)} added to wallet successfully.`,
    };
  }
}

