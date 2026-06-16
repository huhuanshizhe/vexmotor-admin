import '@/lib/env';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;
const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT_SECONDS ?? 30);
const idleTimeout = Number(process.env.DB_IDLE_TIMEOUT_SECONDS ?? (process.env.NODE_ENV === 'production' ? 20 : 5));
const isDatabaseEnabledInDevelopment = process.env.DB_ENABLE_IN_DEV === 'true';
const shouldUseDatabase = Boolean(connectionString) && (isProduction || isDatabaseEnabledInDevelopment);
const resolvedConnectionString = shouldUseDatabase && connectionString ? connectionString : null;

const client = resolvedConnectionString
  ? postgres(resolvedConnectionString, {
      prepare: false,
      max: 5,
      idle_timeout: idleTimeout,
      connect_timeout: connectTimeout,
    })
  : null;

export const db = client ? drizzle(client, { schema }) : null;
export { schema };
