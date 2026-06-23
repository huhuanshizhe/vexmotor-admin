DO $$ BEGIN
 CREATE TYPE "public"."editorial_content_module" AS ENUM('editorial', 'faq');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "editorial_contents" ADD COLUMN IF NOT EXISTS "content_module" "editorial_content_module" DEFAULT 'editorial' NOT NULL;
--> statement-breakpoint
ALTER TABLE "editorial_content_translations" ADD COLUMN IF NOT EXISTS "content_module" "editorial_content_module" DEFAULT 'editorial' NOT NULL;
--> statement-breakpoint
UPDATE "editorial_contents"
SET "content_module" = 'faq'
WHERE "board_key" IN ('faq', 'tech-faq');
--> statement-breakpoint
UPDATE "editorial_content_translations" AS t
SET "content_module" = c."content_module"
FROM "editorial_contents" AS c
WHERE t."content_id" = c."id";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editorial_contents_content_module_board_idx" ON "editorial_contents" USING btree ("content_module","board_key");
--> statement-breakpoint
DROP INDEX IF EXISTS "editorial_content_translations_type_slug_locale_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "editorial_content_translations_module_slug_locale_unique" ON "editorial_content_translations" USING btree ("content_module","slug","locale");
