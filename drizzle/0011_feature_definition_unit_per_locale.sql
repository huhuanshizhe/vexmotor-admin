-- Move definition-level unit back to per-locale translations for number types
UPDATE "feature_definition_translations" ft
SET "unit" = fd."unit"
FROM "feature_definitions" fd
WHERE fd."id" = ft."definition_id"
  AND fd."value_type" = 'number'
  AND fd."unit" IS NOT NULL
  AND trim(fd."unit") <> ''
  AND (ft."unit" IS NULL OR trim(ft."unit") = '');

UPDATE "feature_definitions"
SET "unit" = NULL
WHERE "value_type" = 'number';
