import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Req, 
  BadRequestException 
} from "@nestjs/common";
import { WalletLedgerService } from "./wallet-ledger.service";
import { AuthService } from "../auth/auth.service";

@Controller("merchant/wallet")
export class MerchantWalletController {
  constructor(
    private readonly walletService: WalletLedgerService,
    private readonly authService: AuthService
  ) {}

  private extractUserId(req: any): string {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload = this.authService.validateUserToken(token);
        if (payload?.sub) return payload.sub;
      } catch {}
    }
    const customUserId = req.headers["x-user-id"] || req.query?.userId;
    if (customUserId && typeof customUserId === "string") {
      return customUserId;
    }
    return "user-vendor-pilot";
  }

  @Get()
  getMerchantWallet(@Req() req: any) {
    const userId = this.extractUserId(req);
    const summary = this.walletService.getWalletSummary(userId, "MERCHANT");
    const txns = this.walletService.getUserTransactions(userId, "MERCHANT", { pageSize: 50 });

    return {
      success: true,
      data: {
        wallet: {
          balance: summary.balance,
          totalCredits: summary.totalAdded,
          totalDebits: summary.totalSpent,
          totalRewards: summary.totalRewards || 500,
          status: summary.status,
          currency: summary.currency,
          lastTransactionAt: summary.lastTransaction?.createdAt || new Date().toISOString()
        },
        transactions: txns.data.map(t => ({
          id: t.id,
          reference: t.reference,
          type: t.type,
          amount: t.amount,
          balanceAfter: t.balance_after,
          category: t.category,
          reason: t.reason || "Business wallet transaction",
          status: t.status,
          createdAt: t.created_at
        }))
      }
    };
  }

  @Post("topup")
  topupMerchantWallet(@Req() req: any, @Body() body: { amount: number; paymentMethod?: string }) {
    const userId = this.extractUserId(req);
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException("Top-up amount must be greater than zero");
    }

    const res = this.walletService.creditWallet({
      userId,
      userType: "MERCHANT",
      amount: body.amount,
      category: "TOPUP",
      reason: `Merchant Wallet Top-up via ${body.paymentMethod || "UPI/Card"}`,
      adminId: "SELF",
      adminRemarks: "Merchant top-up",
      externalRef: `M_TOPUP_${Date.now()}`,
      idempotencyKey: `m_topup_${userId}_${Date.now()}`,
    });

    return {
      success: true,
      data: res,
      message: `₹${body.amount.toFixed(2)} added to business wallet successfully.`,
    };
  }
}

