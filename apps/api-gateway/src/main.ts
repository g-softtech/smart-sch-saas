import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable class-validator across all controllers.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }));
  await app.listen(3000);
}
bootstrap();
