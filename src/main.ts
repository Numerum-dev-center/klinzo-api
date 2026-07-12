import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupSwagger } from './shared/config/swagger.config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sécurité Globale
  app.enableCors();
  app.use(helmet());

  // Validation globale et transformation (Ex: String "10" -> Number 10)
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true 
  }));

  // Patch pour la sérialisation des BigInt
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  // Configuration Swagger
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
