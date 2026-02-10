import { drizzle } from 'drizzle-orm/neon-serverless';
import config from '@/lib/config';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: config.env.databaseUrl!,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool);
