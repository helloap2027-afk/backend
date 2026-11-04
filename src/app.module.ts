import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { LocationsModule } from "./locations/locations.module";
import { CategoriesModule } from "./categories/categories.module";
import { BusinessesModule } from "./businesses/businesses.module";
import { EnquiriesModule } from "./enquiries/enquiries.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { AdminModule } from "./admin/admin.module";
import { CmsModule } from "./cms/cms.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    CategoriesModule,
    BusinessesModule,
    EnquiriesModule,
    ReviewsModule,
    AdminModule,
    CmsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
