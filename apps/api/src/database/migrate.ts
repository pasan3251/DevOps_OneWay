import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as path from 'path';

async function runMigrations() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://waypoint_user:waypoint_secure_pass@localhost:5432/waypoint_db';

  console.log('[Migration] Connecting to database...');
  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  try {
    const migrationsFolder = path.resolve(__dirname, 'migrations');
    console.log(`[Migration] Running migrations from ${migrationsFolder}...`);
    await migrate(db, { migrationsFolder });
    console.log('[Migration] Migrations applied successfully!');
  } catch (error) {
    console.error('[Migration] Failed to apply migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

export { runMigrations };
