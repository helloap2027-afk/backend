import { Module } from "@nestjs/common";
import { BusinessesService } from "./businesses.service";
import { BusinessesController } from "./businesses.controller";
import { SearchController } from "./search.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [BusinessesController, SearchController],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}

