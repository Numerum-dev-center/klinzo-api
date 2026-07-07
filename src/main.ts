import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './shared/config/swagger.config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité Globale
  app.enableCors();
  app.use(helmet());

  // Configuration Swagger
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
