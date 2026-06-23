import '@/lib/env';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required. Configure PostgreSQL in .env before starting the app.');
}

const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT_SECONDS ?? 30);
const idleTimeout = Number(process.env.DB_IDLE_TIMEOUT_SECONDS ?? (process.env.NODE_ENV === 'production' ? 20 : 5));

const client = postgres(connectionString, {
  prepare: false,
  max: 5,
  idle_timeout: idleTimeout,
  connect_timeout: connectTimeout,
});

export const db = drizzle(client, { schema });
export { schema };
