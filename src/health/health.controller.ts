import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Central API System Health Check" })
  @ApiResponse({ status: 200, description: "System operational" })
  check() {
    return {
      status: "OK",
      service: "HELLO Central API Engine",
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      endpoints: {
        api: "https://api.hello-hi.in",
        website: "https://hello-hi.in",
        admin: "https://admin.hello-hi.in"
      }
    };
  }
}

