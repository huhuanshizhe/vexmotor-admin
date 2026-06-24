ALTER TABLE "feature_definitions" ADD COLUMN IF NOT EXISTS "key" varchar(120);
--> statement-breakpoint
UPDATE "feature_definitions" fd
SET "key" = sub."candidate"
FROM (
  SELECT DISTINCT ON (ft."definition_id")
    ft."definition_id",
    trim(both '-' from lower(regexp_replace(regexp_replace(trim(ft."name"), '[^a-zA-Z-]+', '-', 'g'), '-+', '-', 'g'))) AS candidate
  FROM "feature_definition_translations" ft
  ORDER BY ft."definition_id", CASE WHEN ft."locale" = 'en' THEN 0 ELSE 1 END, ft."created_at"
) sub
WHERE fd."id" = sub."definition_id"
  AND (fd."key" IS NULL OR trim(fd."key") = '');
--> statement-breakpoint
UPDATE "feature_definitions"
SET "key" = 'feature-' || replace(substring("id"::text, 1, 8), '-', '')
WHERE "key" IS NULL OR trim("key") = '';
--> statement-breakpoint
WITH ranked AS (
  SELECT
    "id",
    "key",
    row_number() OVER (PARTITION BY "key" ORDER BY "created_at", "id") AS rn
  FROM "feature_definitions"
)
UPDATE "feature_definitions" fd
SET "key" = CASE
  WHEN ranked.rn = 1 THEN fd."key"
  ELSE fd."key" || '-' || ranked.rn::text
END
FROM ranked
WHERE fd."id" = ranked."id"
  AND ranked.rn > 1;
--> statement-breakpoint
ALTER TABLE "feature_definitions" ALTER COLUMN "key" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feature_definitions_key_unique" ON "feature_definitions" ("key");
