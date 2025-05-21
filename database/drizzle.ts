import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import config from '@/lib/config';

const sql = neon(config.env.databaseUrl!); // Now using config
export const db = drizzle(sql);
