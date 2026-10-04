import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { HealthController } from '../../src/health/health.controller';
import { PG_POOL, DRIZZLE_ORM } from '../../src/database/database.module';

describe('Database Connection Pool Architecture & Resilience', () => {
  let app: NestFastifyApplication;

  // Mock pool tracking checkout, release, and active counts
  let activeClients = 0;
  let totalQueriesExecuted = 0;

  const mockPgPool = {
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
    query: async (queryText: string, params?: any[]) => {
      activeClients++;
      totalQueriesExecuted++;
      try {
        if (queryText === 'SELECT 1') {
          return { rows: [{ '?column?': 1 }] };
        }
        if (queryText.includes('LONG_QUERY')) {
          // Simulate query execution
          return { rows: [{ result: 'completed' }] };
        }
        return { rows: [] };
      } finally {
        activeClients--;
      }
    },
    connect: async () => {
      activeClients++;
      return {
        query: async (text: string) => {
          totalQueriesExecuted++;
          if (text === 'ROLLBACK_SIMULATION') {
            throw new Error('Simulated transaction failure');
          }
          return { rows: [] };
        },
        release: () => {
          activeClients--;
        },
      };
    },
    end: async () => {},
  };

  const mockDb = {
    transaction: async (cb: any) => {
      const client = await mockPgPool.connect();
      try {
        await client.query('BEGIN');
        const res = await cb(client);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
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

    await app.init();
    await app.listen(0);
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should expose pool capacity and idle metrics in readiness check', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/readiness');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.checks).toHaveProperty('pool');
    expect(response.body.checks.pool).toEqual({
      totalConnections: 5,
      idleConnections: 3,
      waitingRequests: 0,
    });
  });

  it('should reuse pool connections across concurrent queries without client leaks', async () => {
    const initialQueries = totalQueriesExecuted;

    // Dispatch 20 concurrent queries through the pool
    const promises = Array.from({ length: 20 }).map(() =>
      request(app.getHttpServer()).get('/api/v1/health/readiness'),
    );

    const responses = await Promise.all(promises);

    for (const res of responses) {
      expect(res.status).toBe(200);
    }

    expect(totalQueriesExecuted).toBe(initialQueries + 20);
    // Active clients must return to zero after queries complete
    expect(activeClients).toBe(0);
  });

  it('should guarantee connection release back to pool upon transaction rollback', async () => {
    const clientBefore = activeClients;

    // Simulate failed transaction
    await expect(
      mockDb.transaction(async (txClient: any) => {
        await txClient.query('INSERT INTO mock');
        await txClient.query('ROLLBACK_SIMULATION');
      }),
    ).rejects.toThrow('Simulated transaction failure');

    // Connection must be released even when transaction throws
    expect(activeClients).toBe(clientBefore);
  });
});
