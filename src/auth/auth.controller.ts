import { Controller, Post, Body, Get, Delete, Param, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./guards/auth.guard";
import { CurrentUser } from "./decorators/roles.decorator";

class SendOtpDto {
  phoneNumber!: string;
  purpose?: string;
}

class ResendOtpDto {
  challengeId!: string;
}

class VerifyOtpDto {
  challengeId!: string;
  otp!: string;
  deviceInfo?: string;
}

class RefreshTokenDto {
  refreshToken!: string;
}

class SwitchRoleDto {
  targetRole!: string;
}

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

<<<<<<< HEAD
  @Post("otp/request")
  @ApiOperation({ summary: "Request 6-digit SMS OTP" })
  @ApiResponse({ status: 200, description: "OTP challenge created" })
  async requestOtp(@Body() body: SendOtpDto) {
    const data = await this.authService.sendOtp(body.phoneNumber, body.purpose);
    return {
      success: true,
      data
    };
  }

  @Post("otp/send")
  @ApiOperation({ summary: "Dispatch 6-digit SMS OTP with sliding-window rate limit" })
=======
  @Post("check-user")
  @ApiOperation({ summary: "Check if phone is registered and its assigned roles (Customer/Partner)" })
  async checkUser(@Body() body: any) {
    const phone = body.phoneNumber || body.phone;
    const data = await this.authService.checkUserStatus(phone);
    return {
      success: true,
      data,
    };
  }

  @Post("otp/request")
  @ApiOperation({ summary: "Request 6-digit SMS OTP with strict role validation" })
>>>>>>> feature/superadmin
  @ApiResponse({ status: 200, description: "OTP challenge created" })
  async requestOtp(@Body() body: any) {
    const phone = body.phoneNumber || body.phone;
    const data = await this.authService.sendOtp(phone, body.purpose, body.role);
    return {
      success: true,
      data
    };
  }

  @Post("otp/send")
  @ApiOperation({ summary: "Dispatch 6-digit SMS OTP with sliding-window rate limit and strict role check" })
  @ApiResponse({ status: 200, description: "OTP challenge created" })
  async sendOtp(@Body() body: any) {
    const phone = body.phoneNumber || body.phone;
    const data = await this.authService.sendOtp(phone, body.purpose, body.role);
    return {
      success: true,
      data
    };
  }

  @Post("otp/resend")
  @ApiOperation({ summary: "Resend 6-digit SMS OTP adhering to mandatory cooldown" })
  @ApiResponse({ status: 200, description: "New OTP dispatched" })
  async resendOtp(@Body() body: ResendOtpDto) {
    const data = await this.authService.resendOtp(body.challengeId);
    return {
      success: true,
      data
    };
  }

  @Post("otp/resend")
  @ApiOperation({ summary: "Resend 6-digit SMS OTP adhering to mandatory cooldown" })
  @ApiResponse({ status: 200, description: "New OTP dispatched" })
  async resendOtp(@Body() body: ResendOtpDto) {
    const data = await this.authService.resendOtp(body.challengeId);
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

  @Post("refresh")
  @ApiOperation({ summary: "Rotate refresh token and issue new JWT access token" })
  async refresh(@Body() body: RefreshTokenDto) {
    const data = await this.authService.rotateRefreshToken(body.refreshToken);
    return {
      success: true,
      data
    };
  }

  @Post("token/refresh")
  @ApiOperation({ summary: "Rotate refresh token and issue new JWT access token (alias)" })
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
  @ApiOperation({ summary: "Revoke current user session and logout" })
  async logout(@CurrentUser("sub") userId: string, @Body() body: Partial<RefreshTokenDto>) {
    return this.authService.logout(userId, body.refreshToken);
  }

  @Post("logout-all")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke all active sessions across all devices" })
  async logoutAll(@CurrentUser("sub") userId: string) {
    return this.authService.logoutAll(userId);
  }

  @Get("sessions")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all active sessions for current user" })
  async getSessions(@CurrentUser("sub") userId: string) {
    const data = this.authService.getUserSessions(userId);
    return {
      success: true,
      data
    };
  }

  @Delete("sessions/:id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke a specific active session" })
  async revokeSession(@CurrentUser("sub") userId: string, @Param("id") sessionId: string) {
    return this.authService.revokeSession(userId, sessionId);
  }

  @Post("switch-role")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Switch active role between Customer and Vendor" })
  async switchRole(@CurrentUser("sub") userId: string, @Body() body: SwitchRoleDto) {
    const data = await this.authService.switchRole(userId, body.targetRole);
    return {
      success: true,
      data
    };
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
