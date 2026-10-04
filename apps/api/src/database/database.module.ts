import { Module, Global, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE_ORM = 'DRIZZLE_ORM';
export const PG_POOL = 'PG_POOL';

export type DrizzleDb = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DatabasePool');

        const connectionString = configService.get<string>(
          'DATABASE_URL',
          'postgresql://waypoint_user:waypoint_secure_pass@localhost:5432/waypoint_db',
        );

        const poolMin = Number(configService.get('DATABASE_POOL_MIN', '2'));
        const poolMax = Number(configService.get('DATABASE_POOL_MAX', '15'));
        const connectionTimeoutMillis = Number(configService.get('DATABASE_CONNECT_TIMEOUT_MS', '5000'));
        const idleTimeoutMillis = Number(configService.get('DATABASE_IDLE_TIMEOUT_MS', '30000'));
        const statementTimeout = Number(configService.get('DATABASE_STATEMENT_TIMEOUT_MS', '15000'));

        const pool = new Pool({
          connectionString,
          min: poolMin,
          max: poolMax,
          idleTimeoutMillis,
          connectionTimeoutMillis,
          statement_timeout: statementTimeout,
          application_name: configService.get('DATABASE_APP_NAME', 'waypoint_api'),
        });

        pool.on('error', (err) => {
          logger.error('Unexpected error on idle PostgreSQL client in pool:', err.stack);
        });

        logger.log(
          `PostgreSQL Connection Pool initialized [min: ${poolMin}, max: ${poolMax}, idleTimeout: ${idleTimeoutMillis}ms, connectTimeout: ${connectionTimeoutMillis}ms, statementTimeout: ${statementTimeout}ms]`,
        );

        return pool;
      },
    },
    {
      provide: DRIZZLE_ORM,
      inject: [PG_POOL],
      useFactory: (pool: Pool): DrizzleDb => {
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE_ORM, PG_POOL],
})
export class DatabaseModule implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy() {
    this.logger.log('Draining PostgreSQL connection pool on application shutdown...');
    await this.pool.end();
    this.logger.log('PostgreSQL connection pool drained successfully.');
  }
}
