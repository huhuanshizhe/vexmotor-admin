CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" varchar(32) PRIMARY KEY NOT NULL DEFAULT 'default',
  "default_currency_code" varchar(3) NOT NULL DEFAULT 'USD',
  "default_country_code" varchar(16) NOT NULL DEFAULT 'US',
  "extra" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "site_settings" ("id", "default_currency_code", "default_country_code", "extra", "updated_at")
SELECT
  'default',
  COALESCE("currency_code", 'USD'),
  COALESCE("default_country_code", 'US'),
  '{}'::jsonb,
  now()
FROM "commerce_settings"
WHERE "id" = 'default'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "site_settings" ("id", "default_currency_code", "default_country_code", "extra", "updated_at")
SELECT 'default', 'USD', 'US', '{}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM "site_settings" WHERE "id" = 'default');

UPDATE "commerce_settings"
SET "shipping_country_rates" = COALESCE(
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem ? 'currencyCode' THEN elem
        ELSE elem || jsonb_build_object('currencyCode', COALESCE(cs."currency_code", 'USD'))
      END
    )
    FROM jsonb_array_elements(cs."shipping_country_rates") AS elem
  ),
  '[]'::jsonb
)
FROM "commerce_settings" AS cs
WHERE "commerce_settings"."id" = cs."id";

ALTER TABLE "commerce_settings" DROP COLUMN IF EXISTS "currency_code";
ALTER TABLE "commerce_settings" DROP COLUMN IF EXISTS "default_country_code";
