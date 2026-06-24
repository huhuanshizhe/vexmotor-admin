ALTER TABLE "feature_definition_translations" ADD COLUMN IF NOT EXISTS "name" varchar(150);
--> statement-breakpoint
UPDATE "feature_definition_translations" AS t
SET "name" = d."name"
FROM "feature_definitions" AS d
WHERE t."definition_id" = d."id" AND (t."name" IS NULL OR t."name" = '');
--> statement-breakpoint
UPDATE "feature_definition_translations" SET "name" = 'Untitled' WHERE "name" IS NULL OR trim("name") = '';
--> statement-breakpoint
ALTER TABLE "feature_definition_translations" ALTER COLUMN "name" SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "feature_definitions_category_name_unique";
--> statement-breakpoint
ALTER TABLE "feature_definitions" DROP COLUMN IF EXISTS "name";
