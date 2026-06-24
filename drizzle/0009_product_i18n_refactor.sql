ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "has_multiple_specs" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "featured_sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "slug" varchar(255);
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "description_long" text;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "price" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "compare_at_price" numeric(12, 2);
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "currency_code" varchar(3) DEFAULT 'USD' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "stock_quantity" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "moq" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "lead_time_min" integer DEFAULT 3 NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "lead_time_max" integer DEFAULT 15 NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "lead_time_unit" varchar(20) DEFAULT 'business_days' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "lifecycle_status" "product_lifecycle" DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "eol_date" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "last_time_buy_date" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "efficiency_class" varchar(20);
--> statement-breakpoint
ALTER TABLE "product_translations" ADD COLUMN IF NOT EXISTS "payload" jsonb DEFAULT '{"coverUrl":null,"coverAlt":null,"gallery":[],"tags":[],"attachments":[],"certifications":[]}'::jsonb NOT NULL;
--> statement-breakpoint
INSERT INTO "product_translations" (
  "product_id", "locale", "name", "slug", "short_description", "description", "description_long",
  "seo_title", "seo_description", "price", "compare_at_price", "currency_code", "stock_quantity", "moq",
  "lead_time_min", "lead_time_max", "lead_time_unit", "lifecycle_status", "eol_date", "last_time_buy_date",
  "efficiency_class", "payload"
)
SELECT
  p."id", 'en', p."name", p."slug", p."short_description", p."description", p."description_long",
  p."seo_title", p."seo_description", p."price", p."compare_at_price", p."currency_code", p."stock_quantity", p."moq",
  p."lead_time_min", p."lead_time_max", p."lead_time_unit", p."lifecycle_status", p."eol_date", p."last_time_buy_date",
  p."efficiency_class",
  jsonb_build_object(
    'coverUrl', (SELECT pi."url" FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."is_primary" = true ORDER BY pi."sort_order" ASC LIMIT 1),
    'coverAlt', COALESCE((SELECT pi."alt" FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."is_primary" = true ORDER BY pi."sort_order" ASC LIMIT 1), ''),
    'gallery', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('url', pi."url", 'alt', pi."alt", 'width', pi."width", 'height', pi."height") ORDER BY pi."sort_order" ASC)
      FROM "product_images" pi
      WHERE pi."product_id" = p."id" AND pi."is_primary" = false
    ), '[]'::jsonb),
    'tags', '[]'::jsonb,
    'attachments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', a."name", 'url', a."url", 'mimeType', a."mime_type") ORDER BY a."sort_order" ASC)
      FROM "attachments" a
      WHERE a."product_id" = p."id"
    ), '[]'::jsonb),
    'certifications', COALESCE(p."certifications", '[]'::jsonb)
  )
FROM "products" p
WHERE NOT EXISTS (
  SELECT 1 FROM "product_translations" pt
  WHERE pt."product_id" = p."id" AND pt."locale" = 'en'
)
AND EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'name'
);
--> statement-breakpoint
UPDATE "product_translations" AS pt
SET
  "name" = COALESCE(NULLIF(trim(pt."name"), ''), p."name"),
  "slug" = COALESCE(NULLIF(trim(pt."slug"), ''), p."slug"),
  "short_description" = COALESCE(pt."short_description", p."short_description"),
  "description" = COALESCE(pt."description", p."description"),
  "description_long" = COALESCE(pt."description_long", p."description_long"),
  "seo_title" = COALESCE(pt."seo_title", p."seo_title"),
  "seo_description" = COALESCE(pt."seo_description", p."seo_description"),
  "price" = COALESCE(pt."price", p."price"),
  "compare_at_price" = COALESCE(pt."compare_at_price", p."compare_at_price"),
  "currency_code" = COALESCE(NULLIF(trim(pt."currency_code"), ''), p."currency_code"),
  "stock_quantity" = COALESCE(pt."stock_quantity", p."stock_quantity"),
  "moq" = COALESCE(pt."moq", p."moq"),
  "lead_time_min" = COALESCE(pt."lead_time_min", p."lead_time_min"),
  "lead_time_max" = COALESCE(pt."lead_time_max", p."lead_time_max"),
  "lead_time_unit" = COALESCE(NULLIF(trim(pt."lead_time_unit"), ''), p."lead_time_unit"),
  "lifecycle_status" = COALESCE(pt."lifecycle_status", p."lifecycle_status"),
  "eol_date" = COALESCE(pt."eol_date", p."eol_date"),
  "last_time_buy_date" = COALESCE(pt."last_time_buy_date", p."last_time_buy_date"),
  "efficiency_class" = COALESCE(pt."efficiency_class", p."efficiency_class"),
  "payload" = CASE
    WHEN pt."locale" = 'en' THEN jsonb_build_object(
      'coverUrl', (SELECT pi."url" FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."is_primary" = true ORDER BY pi."sort_order" ASC LIMIT 1),
      'coverAlt', COALESCE((SELECT pi."alt" FROM "product_images" pi WHERE pi."product_id" = p."id" AND pi."is_primary" = true ORDER BY pi."sort_order" ASC LIMIT 1), ''),
      'gallery', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('url', pi."url", 'alt', pi."alt", 'width', pi."width", 'height', pi."height") ORDER BY pi."sort_order" ASC)
        FROM "product_images" pi
        WHERE pi."product_id" = p."id" AND pi."is_primary" = false
      ), '[]'::jsonb),
      'tags', COALESCE(pt."payload"->'tags', '[]'::jsonb),
      'attachments', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('name', a."name", 'url', a."url", 'mimeType', a."mime_type") ORDER BY a."sort_order" ASC)
        FROM "attachments" a
        WHERE a."product_id" = p."id"
      ), '[]'::jsonb),
      'certifications', COALESCE(p."certifications", pt."payload"->'certifications', '[]'::jsonb)
    )
    ELSE COALESCE(pt."payload", '{"coverUrl":null,"coverAlt":null,"gallery":[],"tags":[],"attachments":[],"certifications":[]}'::jsonb)
  END
FROM "products" p
WHERE pt."product_id" = p."id"
AND EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'name'
);
--> statement-breakpoint
UPDATE "product_translations" SET "name" = 'Untitled' WHERE "name" IS NULL OR trim("name") = '';
--> statement-breakpoint
UPDATE "product_translations" SET "slug" = 'product-' || substr(replace("id"::text, '-', ''), 1, 12) WHERE "slug" IS NULL OR trim("slug") = '';
--> statement-breakpoint
ALTER TABLE "product_translations" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_translations" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_translations_slug_locale_unique" ON "product_translations" ("slug", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_translations_product_id_idx" ON "product_translations" ("product_id");
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'inactive';
--> statement-breakpoint
DROP INDEX IF EXISTS "products_slug_unique";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "name";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "slug";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "short_description";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "description";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "description_long";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "price";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "compare_at_price";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "currency_code";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "stock_quantity";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "moq";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "lead_time_min";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "lead_time_max";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "lead_time_unit";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "lifecycle_status";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "eol_date";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "last_time_buy_date";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "efficiency_class";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "certifications";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "seo_title";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "seo_description";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "published_at";
