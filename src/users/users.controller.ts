import { Controller, Get, Patch, Post, Body, Param, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthGuard } from "../auth/guards/auth.guard";
import { CurrentUser } from "../auth/decorators/roles.decorator";

@Controller("users")
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getProfile(@CurrentUser() user: any) {
    const profile = this.usersService.getProfile(user.sub);
    return {
      success: true,
      data: profile,
    };
  }

  @Patch("me")
  updateProfile(
    @CurrentUser() user: any,
    @Body() body: { fullName?: string; email?: string; avatarUrl?: string; preferredLanguage?: string; localityId?: string },
  ) {
    const profile = this.usersService.updateProfile(user.sub, body);
    return {
      success: true,
      data: profile,
      message: "Profile updated successfully.",
    };
  }

  @Post("mode/switch")
  switchMode(
    @CurrentUser() user: any,
    @Body() body: { targetMode: "customer" | "vendor" },
  ) {
    const result = this.usersService.evaluateModeSwitch(user.sub, body.targetMode || "customer");
    return result;
  }

  @Post("saved-businesses/:businessId")
  toggleSavedBusiness(
    @CurrentUser() user: any,
    @Param("businessId") businessId: string,
  ) {
    const data = this.usersService.toggleSavedBusiness(user.sub, businessId);
    return {
      success: true,
      data,
    };
  }

  @Get("saved-businesses")
  getSavedBusinesses(@CurrentUser() user: any) {
    const data = this.usersService.getSavedBusinesses(user.sub);
    return {
      success: true,
      data,
      meta: {
        total: data.length,
      },
    };
  }
}
