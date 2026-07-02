CREATE TABLE IF NOT EXISTS "shipping_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(100) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shipping_methods_code_unique" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "shipping_method_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "shipping_method_id" uuid NOT NULL,
  "locale" varchar(16) NOT NULL,
  "name" varchar(150) NOT NULL,
  "eta_label" varchar(100) NOT NULL DEFAULT '',
  "note" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shipping_method_translations_shipping_method_id_fkey" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods"("id") ON DELETE CASCADE,
  CONSTRAINT "shipping_method_translations_method_locale_unique" UNIQUE ("shipping_method_id", "locale")
);

CREATE INDEX IF NOT EXISTS "shipping_methods_enabled_idx" ON "shipping_methods" ("enabled");
CREATE INDEX IF NOT EXISTS "shipping_method_translations_locale_idx" ON "shipping_method_translations" ("locale");

INSERT INTO "shipping_methods" ("id", "code", "enabled", "sort_order", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  lower(regexp_replace(trim(elem->>'code'), '[^a-zA-Z0-9]+', '-', 'g')),
  COALESCE((elem->>'enabled')::boolean, true),
  COALESCE((elem->>'sortOrder')::integer, 0),
  now(),
  now()
FROM "commerce_settings" cs
CROSS JOIN LATERAL jsonb_array_elements(cs."shipping_methods") AS elem
WHERE cs."id" = 'default'
  AND jsonb_array_length(cs."shipping_methods") > 0
  AND NOT EXISTS (SELECT 1 FROM "shipping_methods" LIMIT 1)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "shipping_method_translations" ("shipping_method_id", "locale", "name", "eta_label", "note", "created_at", "updated_at")
SELECT
  sm."id",
  'en',
  COALESCE(NULLIF(trim(elem->>'name'), ''), sm."code"),
  COALESCE(trim(elem->>'etaLabel'), ''),
  NULLIF(trim(elem->>'note'), ''),
  now(),
  now()
FROM "commerce_settings" cs
CROSS JOIN LATERAL jsonb_array_elements(cs."shipping_methods") AS elem
INNER JOIN "shipping_methods" sm ON sm."code" = lower(regexp_replace(trim(elem->>'code'), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE cs."id" = 'default'
  AND jsonb_array_length(cs."shipping_methods") > 0
  AND NOT EXISTS (SELECT 1 FROM "shipping_method_translations" LIMIT 1)
ON CONFLICT ("shipping_method_id", "locale") DO NOTHING;

UPDATE "commerce_settings"
SET "shipping_methods" = '[]'::jsonb,
    "updated_at" = now()
WHERE "id" = 'default'
  AND jsonb_array_length("shipping_methods") > 0
  AND EXISTS (SELECT 1 FROM "shipping_methods" LIMIT 1);
