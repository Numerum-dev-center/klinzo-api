import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './shared/config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuration Swagger
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
