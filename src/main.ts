import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API Prefix
  app.setGlobalPrefix("api/v1");

  // Disable ETag to prevent 304 empty body responses on mobile
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("etag", false);

  // Global no-cache header for dynamic JSON APIs
  app.use((req: any, res: any, next: any) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // Comprehensive CORS Configuration (Web, Mobile 8081, Admin, LAN)
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Permissive in dev so mobile and web admin are never blocked
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Business-Id",
      "X-Requested-With",
      "Accept",
      "If-None-Match",
      "Cache-Control",
      "cache-control",
      "Pragma",
      "pragma",
      "Expires",
      "Origin",
      "x-admin-user",
      "x-admin-role",
      "X-Admin-User",
      "X-Admin-Role"
    ]
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle("HELLO REST API")
    .setDescription("Hyperlocal Business Discovery & Instant Enquiry Engine")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[HELLO API] Running on port ${port} - Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
