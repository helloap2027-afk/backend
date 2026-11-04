import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdsController } from "./ads.controller";
import { AdsService } from "./ads.service";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AdminController, AdsController],
  providers: [AdminService, AdsService],
  exports: [AdminService, AdsService],
})
export class AdminModule {}
