import '@/lib/env';

import postgres from 'postgres';

const email = process.argv[2];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    if (email) {
      const rows = await sql`
        SELECT id, email, first_name, last_name, company, job_title, status, created_at
        FROM users
        WHERE email = ${email.toLowerCase()}
      `;
      console.log(JSON.stringify(rows, null, 2));
      return;
    }

    const [count] = await sql`SELECT count(*)::int AS total FROM users`;
    const recent = await sql`
      SELECT email, first_name, last_name, status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `;
    console.log(JSON.stringify({ total: count?.total ?? 0, recent }, null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
