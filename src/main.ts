import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API Prefix
  app.setGlobalPrefix("api/v1");

  // Production CORS Configuration
  app.enableCors({
    origin: [
      "https://hello-hi.in",
      "https://admin.hello-hi.in",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Business-Id", "X-Requested-With"]
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

