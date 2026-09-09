import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { Express } from 'express';
import { AppModule } from './src/app.module';
import { configureApp } from './src/bootstrap';

const server: Express = express();
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  configureApp(app);
  await app.init();
}

bootstrapPromise = bootstrap();

server.use(async (_req, _res, next) => {
  await bootstrapPromise;
  next();
});

export default server;
