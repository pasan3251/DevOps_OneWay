import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://waypoint_user:waypoint_secure_pass@localhost:5432/waypoint_db',
  },
  verbose: true,
  strict: true,
});
