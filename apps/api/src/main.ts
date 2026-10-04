import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== 'production',
      trustProxy: true,
    }),
  );

  // Global API Prefix
  app.setGlobalPrefix('api/v1');

  // CORS configuration
  await app.register(fastifyCors as any, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-client-mutation-id'],
  });

  // Cookie handling
  await app.register(fastifyCookie as any, {
    secret: process.env.COOKIE_SECRET || 'secure_fastify_cookie_secret_salt_32_chars',
  });

  // Strict Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Waypoint Logistics API')
    .setDescription(
      'Authoritative Backend REST API and Business Rules Engine for Waypoint Logistics Management System',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);
  logger.log(`Waypoint Logistics API Server listening at http://${host}:${port}/api/v1`);
  logger.log(`OpenAPI / Swagger Explorer available at http://${host}:${port}/api/docs`);
}

bootstrap();
