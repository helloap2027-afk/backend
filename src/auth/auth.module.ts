import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { TenantGuard } from "./guards/tenant.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, TenantGuard],
  exports: [AuthService, AuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}

