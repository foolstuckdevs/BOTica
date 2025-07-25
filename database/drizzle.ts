import { drizzle } from 'drizzle-orm/neon-serverless';
import config from '@/lib/config';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: config.env.databaseUrl! });

export const db = drizzle(pool);
