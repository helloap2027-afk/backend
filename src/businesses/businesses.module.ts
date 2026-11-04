import { Module } from "@nestjs/common";
import { BusinessesService } from "./businesses.service";
import { BusinessesController } from "./businesses.controller";
import { SearchController } from "./search.controller";
import { VendorsController } from "./vendors.controller";
<<<<<<< HEAD
=======
import { MerchantController, KycRequirementsController } from "./merchant.controller";
>>>>>>> feature/superadmin
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
<<<<<<< HEAD
  controllers: [BusinessesController, SearchController, VendorsController],
=======
  controllers: [
    BusinessesController,
    SearchController,
    VendorsController,
    MerchantController,
    KycRequirementsController,
  ],
>>>>>>> feature/superadmin
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
