import { Module } from "@nestjs/common";
import { HelpCenterController, AdminHelpCenterController } from "./help-center.controller";
import { HelpCenterService } from "./help-center.service";
import { SupportTicketsController } from "./support-tickets.controller";
import { SupportTicketsService } from "./support-tickets.service";

@Module({
  controllers: [HelpCenterController, AdminHelpCenterController, SupportTicketsController],
  providers: [HelpCenterService, SupportTicketsService],
  exports: [HelpCenterService, SupportTicketsService],
})
export class HelpCenterModule {}

