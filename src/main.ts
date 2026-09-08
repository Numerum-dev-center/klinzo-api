import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupSwagger } from './shared/config/swagger.config';
import helmet from 'helmet';

import * as path from 'path';

function parseCorsOrigin(configService: ConfigService): string[] | boolean {
  const rawOrigin = configService.get<string>('CORS_ORIGIN')?.trim();
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  if (!rawOrigin) {
    return isProduction ? [] : true;
  }

  return rawOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Servir les images et médias sur mesure pour les vues Yeria
  app.useStaticAssets(path.join(process.cwd(), 'public/yeria-assets'), {
    prefix: '/yeria-assets/',
  });

  // Sécurité Globale
  app.use(helmet());
  app.enableCors({
    origin: parseCorsOrigin(configService),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  // Validation globale et transformation (Ex: String "10" -> Number 10)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Patch pour la sérialisation des BigInt
  Object.defineProperty(BigInt.prototype, 'toJSON', {
    value: function (this: bigint): string {
      return this.toString();
    },
    configurable: true,
  });

  // Configuration Swagger
  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED') === 'true' ||
    configService.get<string>('NODE_ENV') !== 'production';
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  const port = configService.get<number>('PORT') ?? 4000;
  await app.listen(port);
  logger.log(`API listening on port ${port}`);
}
bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Failed to start API: ${message}`);
  process.exit(1);
});
