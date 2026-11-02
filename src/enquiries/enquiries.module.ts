import { Module } from "@nestjs/common";
import { EnquiriesService } from "./enquiries.service";
import { EnquiriesController } from "./enquiries.controller";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [EnquiriesController],
  providers: [EnquiriesService],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}

