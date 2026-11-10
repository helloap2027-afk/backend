import { Module, forwardRef } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { MerchantWalletController } from "./merchant-wallet.controller";
import { WalletLedgerService } from "./wallet-ledger.service";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [WalletController, MerchantWalletController],
  providers: [WalletLedgerService],
  exports: [WalletLedgerService],
})
export class WalletModule {}

