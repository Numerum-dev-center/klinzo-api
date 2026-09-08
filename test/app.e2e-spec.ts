import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

jest.mock('@numerum-tech/yeriasdk', () => ({
  YeriaApp: jest.fn().mockImplementation(() => ({
    serve: jest.fn((view: unknown) => view),
  })),
}));

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test_access_secret_with_32_chars_minimum';
    process.env.JWT_REFRESH_SECRET =
      'test_refresh_secret_with_32_chars_minimum';
    process.env.JWT_EXPIRATION = '15m';
    process.env.JWT_REFRESH_EXPIRATION = '7d';

    const { AppModule } = jest.requireActual('../src/app.module');
    const { PrismaService } = jest.requireActual(
      '../src/shared/prisma/prisma.service',
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.service).toBe('klinzo-api');
        expect(typeof body.timestamp).toBe('string');
      });
  });

  it('/platform-settings (GET) requires authentication', () => {
    return request(app.getHttpServer()).get('/platform-settings').expect(401);
  });

  it('/reporting/overview (GET) requires authentication', () => {
    return request(app.getHttpServer()).get('/reporting/overview').expect(401);
  });

  it('/health/ready (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.checks.database).toBe('ok');
      });
  });

  afterEach(async () => {
    await app?.close();
  });
});
