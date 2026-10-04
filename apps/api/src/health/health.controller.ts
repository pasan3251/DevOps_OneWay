import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('System Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Public()
  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe verifying Fastify HTTP process' })
  getLiveness() {
    return {
      status: 'ok',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
    };
  }

  @Public()
  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe verifying PostgreSQL and dependencies connectivity' })
  async getReadiness() {
    let dbStatus = 'down';
    try {
      await this.pool.query('SELECT 1');
      dbStatus = 'up';
    } catch (err: any) {
      dbStatus = `down: ${err.message}`;
    }

    const isReady = dbStatus === 'up';

    return {
      status: isReady ? 'ok' : 'degraded',
      checks: {
        database: dbStatus,
        pool: {
          totalConnections: this.pool.totalCount,
          idleConnections: this.pool.idleCount,
          waitingRequests: this.pool.waitingCount,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
