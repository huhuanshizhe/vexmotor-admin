import { sql } from 'drizzle-orm';
import { db } from './index';

export async function runMigrations() {
  if (!db) return;

  const statements = [
    // Enum type
    `DO $$ BEGIN CREATE TYPE product_lifecycle AS ENUM ('new', 'active', 'nfd', 'eol', 'last_time_buy'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

    // Products table - new columns
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS moq integer DEFAULT 1`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_min integer DEFAULT 3`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_max integer DEFAULT 15`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_unit varchar(20) DEFAULT 'business_days'`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS lifecycle_status product_lifecycle DEFAULT 'active'`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS eol_date timestamptz`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS last_time_buy_date timestamptz`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS efficiency_class varchar(20)`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]'::jsonb`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS configuration_rules jsonb`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS torque_curve_data jsonb`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS paid_sample_enabled boolean DEFAULT false`,

    // Product features - new columns
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS feature_value_min numeric(12,4)`,
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS feature_value_max numeric(12,4)`,
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS value_type varchar(20) DEFAULT 'text'`,
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS conditional_value jsonb`,
    `ALTER TABLE product_features ADD COLUMN IF NOT EXISTS spec_category varchar(50) DEFAULT 'general'`,

    // Product images - new columns
    `ALTER TABLE product_images ADD COLUMN IF NOT EXISTS is_dimension boolean DEFAULT false`,
    `ALTER TABLE product_images ADD COLUMN IF NOT EXISTS image_type varchar(50) DEFAULT 'gallery'`,

    // Product translations table
    `CREATE TABLE IF NOT EXISTS product_translations (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      locale varchar(16) NOT NULL DEFAULT 'en',
      name varchar(255),
      short_description text,
      description text,
      seo_title varchar(255),
      seo_description varchar(500),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS product_translations_product_locale_unique ON product_translations (product_id, locale)`,
  ];

  try {
    for (const stmt of statements) {
      await db.execute(sql.raw(stmt));
    }
    console.log('[DB] Auto-migration completed successfully');
  } catch (error) {
    console.error('[DB] Auto-migration error:', error);
  }
}
