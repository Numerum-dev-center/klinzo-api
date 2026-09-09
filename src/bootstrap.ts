import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { setupSwagger } from './shared/config/swagger.config';
import helmet from 'helmet';

import * as path from 'path';

export function parseCorsOrigin(
  configService: ConfigService,
): string[] | boolean {
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

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);

  const expressApp = app as NestExpressApplication;
  expressApp.useStaticAssets(path.join(process.cwd(), 'public/yeria-assets'), {
    prefix: '/yeria-assets/',
  });

  app.use(helmet());
  app.enableCors({
    origin: parseCorsOrigin(configService),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  Object.defineProperty(BigInt.prototype, 'toJSON', {
    value: function (this: bigint): string {
      return this.toString();
    },
    configurable: true,
  });

  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED') === 'true' ||
    configService.get<string>('NODE_ENV') !== 'production';
  if (swaggerEnabled) {
    setupSwagger(app);
  }
}

export async function listen(app: INestApplication): Promise<void> {
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const port = configService.get<number>('PORT') ?? 4000;

  await app.listen(port);
  logger.log(`API listening on port ${port}`);
}
