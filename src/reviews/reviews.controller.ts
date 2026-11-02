import { Controller, Post, Get, Body, Param, UseGuards } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/decorators/roles.decorator";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(AuthGuard)
  addReview(
    @Body() body: { businessId: string; rating: number; reviewText?: string },
    @CurrentUser() user: any,
  ) {
    const data = this.reviewsService.addOrUpdateReview({
      businessId: body.businessId,
      userId: user.sub,
      rating: body.rating,
      reviewText: body.reviewText,
    });

    return {
      success: true,
      data,
      message: "Review recorded successfully",
    };
  }

  @Get("business/:businessId")
  getBusinessReviews(@Param("businessId") businessId: string) {
    const data = this.reviewsService.getBusinessReviews(businessId);
    return {
      success: true,
      data,
    };
  }
}

