import '@/lib/env';

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import postgres from 'postgres';

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle');
const MIGRATIONS_TABLE = '__app_migrations';

type SqlClient = ReturnType<typeof postgres>;

async function ensureMigrationsTable(sql: SqlClient) {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
      "tag" varchar(255) PRIMARY KEY,
      "applied_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
}

async function tableExists(sql: SqlClient, tableName: string) {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT to_regclass(${`public.${tableName}`}) IS NOT NULL AS exists
  `;
  return Boolean(row?.exists);
}

async function getAppliedTags(sql: SqlClient) {
  const rows = await sql<{ tag: string }[]>`
    SELECT tag FROM ${sql(MIGRATIONS_TABLE)}
    ORDER BY tag
  `;
  return new Set(rows.map((row) => row.tag));
}

async function markApplied(sql: SqlClient, tag: string) {
  await sql`
    INSERT INTO ${sql(MIGRATIONS_TABLE)} (tag)
    VALUES (${tag})
    ON CONFLICT (tag) DO NOTHING
  `;
}

async function listMigrationTags() {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .map((file) => file.replace(/\.sql$/, ''))
    .sort();
}

async function baselineIfNeeded(sql: SqlClient, allTags: string[]) {
  const applied = await getAppliedTags(sql);
  if (applied.size > 0) return;

  const hasProducts = await tableExists(sql, 'products');
  if (!hasProducts) return;

  const baselineTags: string[] = [];

  if (allTags.includes('0000_mixed_stranger')) {
    baselineTags.push('0000_mixed_stranger');
  }

  if (allTags.includes('0001_wealthy_solo') && await tableExists(sql, 'product_relations')) {
    baselineTags.push('0001_wealthy_solo');
  }

  const hasNewEditorial = await tableExists(sql, 'editorial_contents');
  const hasOldEditorial = await tableExists(sql, 'editorial_content_entries');
  if (allTags.includes('0002_editorial_content_split') && hasNewEditorial && !hasOldEditorial) {
    baselineTags.push('0002_editorial_content_split');
  }

  if (allTags.includes('0003_editorial_content_module') && hasNewEditorial) {
    const [moduleColumn] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'editorial_contents'
          AND column_name = 'content_module'
      ) AS exists
    `;
    if (moduleColumn?.exists) {
      baselineTags.push('0003_editorial_content_module');
    }
  }

  if (allTags.includes('0004_brand_translations') && await tableExists(sql, 'brands')) {
    const [translationTable] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'brand_translations'
      ) AS exists
    `;
    if (translationTable?.exists) {
      baselineTags.push('0004_brand_translations');
    }
  }

  if (allTags.includes('0005_category_translations') && await tableExists(sql, 'categories')) {
    const [translationTable] = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'category_translations'
      ) AS exists
    `;
    if (translationTable?.exists) {
      baselineTags.push('0005_category_translations');
    }
  }

  for (const tag of baselineTags) {
    await markApplied(sql, tag);
    console.log(`[db:migrate] Baseline ${tag} (schema already present)`);
  }
}

function splitStatements(content: string) {
  return content
    .split(/--> statement-breakpoint\r?\n?/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runMigrationFile(sql: SqlClient, tag: string) {
  const filePath = path.join(MIGRATIONS_DIR, `${tag}.sql`);
  const content = await readFile(filePath, 'utf8');
  const statements = splitStatements(content);

  await sql.begin(async (tx) => {
    for (const statement of statements) {
      await tx.unsafe(statement);
    }
  });
}

async function columnExists(sql: SqlClient, tableName: string, columnName: string) {
  const [row] = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS exists
  `;
  return Boolean(row?.exists);
}

async function verifySchemaIntegrity(sql: SqlClient, applied: Set<string>) {
  if (applied.has('0005_category_translations')) {
    const hasTranslations = await tableExists(sql, 'category_translations');
    const categoriesStillHaveName = await columnExists(sql, 'categories', 'name');

    if (!hasTranslations) {
      throw new Error(
        '[db:migrate] Migration 0005_category_translations is marked applied, but category_translations is missing. '
        + 'Delete that row from __app_migrations and run pnpm db:migrate again.',
      );
    }

    if (categoriesStillHaveName) {
      console.warn(
        '[db:migrate] Warning: categories.name still exists after 0005_category_translations. '
        + 'Re-run pnpm db:migrate to finish the schema split.',
      );
    }
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Configure PostgreSQL in .env before running migrations.');
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });

  try {
    await ensureMigrationsTable(sql);

    const allTags = await listMigrationTags();
    if (!allTags.length) {
      console.log('[db:migrate] No migration files found in drizzle/.');
      return;
    }

    await baselineIfNeeded(sql, allTags);

    const applied = await getAppliedTags(sql);
    const pending = allTags.filter((tag) => !applied.has(tag));

    if (!pending.length) {
      await verifySchemaIntegrity(sql, applied);
      console.log('[db:migrate] Database is up to date.');
      return;
    }

    for (const tag of pending) {
      console.log(`[db:migrate] Applying ${tag}...`);
      await runMigrationFile(sql, tag);
      await markApplied(sql, tag);
      console.log(`[db:migrate] Applied ${tag}`);
    }

    console.log(`[db:migrate] Done. Applied ${pending.length} migration(s).`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error('[db:migrate] Failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
