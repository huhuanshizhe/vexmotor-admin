import '@/lib/env';

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

export const sql = connectionString
  ? postgres(connectionString, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 30,
    })
  : null;
