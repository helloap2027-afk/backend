import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as path from "node:path";
import * as fs from "node:fs";
import * as express from "express";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Global API Prefix
  app.setGlobalPrefix("api/v1");

  // Disable ETag to prevent 304 empty body responses on mobile
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("etag", false);

  // Allow up to 50MB for image / document base64 uploads
  expressApp.use(express.json({ limit: "50mb" }));
  expressApp.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve static uploaded media
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: "/uploads" });

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
      "authorization",
      "x-user-id",
      "X-User-Id",
      "X-Business-Id",
      "x-business-id",
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
      "X-Admin-Role",
      "x-user-role",
      "X-User-Role",
      "x-active-role",
      "X-Active-Role"
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
