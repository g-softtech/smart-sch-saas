import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable class-validator across all controllers.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
  );
  // Configure CORS securely
  const allowedOrigins: string[] = [];

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  // If specific preview origins are needed, they must be explicitly configured
  if (process.env.PREVIEW_URLS) {
    allowedOrigins.push(
      ...process.env.PREVIEW_URLS.split(",").map((url) => url.trim()),
    );
  }

  // Allow local development ONLY when not in production
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    );
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-tenant-id",
      "x-school-id",
      "x-campus-id",
    ],
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
