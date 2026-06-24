-- Remove legacy range/select feature definitions
DELETE FROM "feature_definitions" WHERE "value_type" IN ('range', 'select');

-- Definition-level unit for number type
ALTER TABLE "feature_definitions" ADD COLUMN IF NOT EXISTS "unit" varchar(50);

UPDATE "feature_definitions" fd
SET "unit" = sub."unit"
FROM (
  SELECT DISTINCT ON (ft."definition_id")
    ft."definition_id",
    ft."unit"
  FROM "feature_definition_translations" ft
  INNER JOIN "feature_definitions" d ON d."id" = ft."definition_id"
  WHERE d."value_type" = 'number'
    AND ft."unit" IS NOT NULL
    AND trim(ft."unit") <> ''
  ORDER BY ft."definition_id", CASE WHEN ft."locale" = 'en' THEN 0 ELSE 1 END, ft."created_at"
) sub
WHERE fd."id" = sub."definition_id"
  AND fd."unit" IS NULL;

ALTER TABLE "feature_definitions" DROP COLUMN IF EXISTS "select_options";

-- Per-locale text value options for text type
ALTER TABLE "feature_definition_translations" ADD COLUMN IF NOT EXISTS "text_options" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE "feature_definition_translations" ft
SET "text_options" = jsonb_build_array(ft."value_text")
FROM "feature_definitions" d
WHERE d."id" = ft."definition_id"
  AND d."value_type" = 'text'
  AND ft."value_text" IS NOT NULL
  AND trim(ft."value_text") <> ''
  AND (ft."text_options" IS NULL OR ft."text_options" = '[]'::jsonb);
