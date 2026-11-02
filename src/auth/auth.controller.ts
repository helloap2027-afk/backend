import { Controller, Post, Body, Get, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./guards/auth.guard";
import { CurrentUser } from "./decorators/roles.decorator";

class SendOtpDto {
  phoneNumber!: string;
  purpose?: string;
}

class VerifyOtpDto {
  challengeId!: string;
  otp!: string;
  deviceInfo?: string;
}

class RefreshTokenDto {
  refreshToken!: string;
}

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("otp/send")
  @ApiOperation({ summary: "Dispatch 6-digit SMS OTP with sliding-window rate limit" })
  @ApiResponse({ status: 200, description: "OTP challenge created" })
  async sendOtp(@Body() body: SendOtpDto) {
    const data = await this.authService.sendOtp(body.phoneNumber, body.purpose);
    return {
      success: true,
      data
    };
  }

  @Post("otp/verify")
  @ApiOperation({ summary: "Verify 6-digit OTP and generate JWT access + refresh tokens" })
  @ApiResponse({ status: 200, description: "Authenticated successfully" })
  async verifyOtp(@Body() body: VerifyOtpDto, @Req() req: any) {
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1";
    const data = await this.authService.verifyOtp(body.challengeId, body.otp, body.deviceInfo, ip);
    return {
      success: true,
      data
    };
  }

  @Post("token/refresh")
  @ApiOperation({ summary: "Rotate refresh token and issue new JWT access token" })
  @ApiResponse({ status: 200, description: "Tokens rotated" })
  async refreshToken(@Body() body: RefreshTokenDto) {
    const data = await this.authService.rotateRefreshToken(body.refreshToken);
    return {
      success: true,
      data
    };
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke user session and logout" })
  async logout(@CurrentUser("sub") userId: string, @Body() body: Partial<RefreshTokenDto>) {
    return this.authService.logout(userId, body.refreshToken);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fetch current authenticated user profile, roles & owned businesses" })
  async getMe(@CurrentUser("sub") userId: string) {
    const data = this.authService.getUserProfile(userId);
    return {
      success: true,
      data
    };
  }
}

