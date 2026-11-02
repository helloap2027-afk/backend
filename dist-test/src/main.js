"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix("api/v1");
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
    const config = new swagger_1.DocumentBuilder()
        .setTitle("HELLO REST API")
        .setDescription("Hyperlocal Business Discovery & Instant Enquiry Engine")
        .setVersion("1.0.0")
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("api/docs", app, document);
    const port = process.env.PORT || 4000;
    await app.listen(port);
    console.log(`[HELLO API] Running on port ${port} - Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
//# sourceMappingURL=main.js.map