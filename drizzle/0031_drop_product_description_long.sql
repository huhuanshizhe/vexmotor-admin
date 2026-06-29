UPDATE "product_translations"
SET "description" = COALESCE("description", "description_long")
WHERE "description_long" IS NOT NULL
  AND "description" IS NULL;

ALTER TABLE "product_translations" DROP COLUMN IF EXISTS "description_long";
