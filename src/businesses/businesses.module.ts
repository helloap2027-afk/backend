import { Module } from "@nestjs/common";
import { BusinessesService } from "./businesses.service";
import { BusinessesController } from "./businesses.controller";
import { SearchController } from "./search.controller";
import { VendorsController } from "./vendors.controller";
import { MerchantController, KycRequirementsController } from "./merchant.controller";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    BusinessesController,
    SearchController,
    VendorsController,
    MerchantController,
    KycRequirementsController,
  ],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
