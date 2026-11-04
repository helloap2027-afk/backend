import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdsController } from "./ads.controller";
import { AdsService } from "./ads.service";
import { EmailController } from "./email.controller";
import { EmailService } from "./email.service";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AdminController, AdsController, EmailController],
  providers: [AdminService, AdsService, EmailService],
  exports: [AdminService, AdsService, EmailService],
})
export class AdminModule {}
