import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { HealthController } from '../../src/health/health.controller';
import { PG_POOL, DRIZZLE_ORM } from '../../src/database/database.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';

describe('API Integration & Contract Testing', () => {
  let app: NestFastifyApplication;

  const mockPgPool = {
    query: async (queryText: string) => {
      if (queryText.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] };
      }
      return { rows: [] };
    },
    end: async () => {},
  };

  const mockDb = {
    query: {},
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PG_POOL,
          useValue: mockPgPool,
        },
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    await app.listen(0);
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/v1/health/liveness should return 200 with status ok', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/liveness');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('uptimeSeconds');
  });

  it('GET /api/v1/health/readiness should verify database status', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/readiness');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.checks.database).toBe('up');
  });
});
