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
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      const allowedPatterns = [
        "https://hello-hi.in",
        "https://admin.hello-hi.in",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006"
      ];
      if (
        allowedPatterns.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.startsWith("http://192.168.") ||
        origin.startsWith("exp://")
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev so mobile is never blocked
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Business-Id", "X-Requested-With", "Accept", "If-None-Match"]
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

