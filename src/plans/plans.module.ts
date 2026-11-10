import { Module } from "@nestjs/common";
import { PlansController } from "./plans.controller";
import { PlansService } from "./plans.service";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [DatabaseModule, AuthModule, WalletModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}

