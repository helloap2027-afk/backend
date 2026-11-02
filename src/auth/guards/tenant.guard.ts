import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const businessId = request.params.businessId || 
                       request.params.id || 
                       request.headers["x-business-id"] ||
                       request.body?.businessId;

    if (!businessId) {
      throw new BadRequestException("Missing target business context identifier.");
    }

    // Root super admin bypasses local tenant boundary
    if (user.roles?.includes("SUPER_ADMIN")) {
      return true;
    }

    // Check ownership or active staff status in SQL
    const membership = this.db.queryOne<any>(
      `SELECT id FROM business_owners WHERE business_id = ? AND user_id = ?
       UNION
       SELECT id FROM business_staff WHERE business_id = ? AND user_id = ? AND status = 'ACTIVE'`,
      [businessId, user.sub, businessId, user.sub]
    );

    if (!membership) {
      throw new ForbiddenException("Access denied: You do not possess management privileges for this business entity.");
    }

    request.tenant = { businessId };
    return true;
  }
}

