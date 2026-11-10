import { Module } from "@nestjs/common";
import { EnquiriesService } from "./enquiries.service";
import { EnquiriesController } from "./enquiries.controller";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [DatabaseModule, AuthModule, NotificationsModule],
  controllers: [EnquiriesController],
  providers: [EnquiriesService],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}

