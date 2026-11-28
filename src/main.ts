//  /$$   /$$  /$$$$$$  /$$   /$$ /$$$$$$$  /$$     /$$ /$$      /$$  /$$$$$$  /$$   /$$
// | $$  | $$ /$$__  $$| $$$ | $$| $$__  $$|  $$   /$$/| $$$    /$$$ /$$__  $$| $$$ | $$
// | $$  | $$| $$  \ $$| $$$$| $$| $$  \ $$ \  $$ /$$/ | $$$$  /$$$$| $$  \ $$| $$$$| $$
// | $$$$$$$$| $$$$$$$$| $$ $$ $$| $$  | $$  \  $$$$/  | $$ $$/$$ $$| $$$$$$$$| $$ $$ $$
// | $$__  $$| $$__  $$| $$  $$$$| $$  | $$   \  $$/   | $$  $$$| $$| $$__  $$| $$  $$$$
// | $$  | $$| $$  | $$| $$\  $$$| $$  | $$    | $$    | $$\  $ | $$| $$  | $$| $$\  $$$
// | $$  | $$| $$  | $$| $$ \  $$| $$$$$$$/    | $$    | $$ \/  | $$| $$  | $$| $$ \  $$
// |__/  |__/|__/  |__/|__/  \__/|_______/     |__/    |__/     |__/|__/  |__/|__/  \__/

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import morgan from 'morgan';

import constants from './constants';
const { SWAGGER, Global } = constants;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // morgan for logging
  app.use(morgan('dev'));

  // Serve uploaded files statically
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
  });

  // enable global validation for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  //  cors
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // WebSocket Adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global Prefix
  app.setGlobalPrefix(Global.PREFIX);

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle(SWAGGER.TITLE)
    .setDescription(SWAGGER.DESCRIPTION)
    .setVersion(SWAGGER.VERSION)
    .addServer('/handyman')
    .addServer('/')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  // swagger document
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${Global.PREFIX}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4022);
  console.log(`🚀 Handyman server is running on port ${process.env.PORT}`);
}

bootstrap();
