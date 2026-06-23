CREATE TABLE IF NOT EXISTS "category_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"payload" jsonb DEFAULT '{"tags":[]}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "category_translations" ("category_id", "locale", "name", "slug", "description", "seo_title", "seo_description", "payload", "created_at", "updated_at")
SELECT
	"id",
	'en',
	"name",
	"slug",
	"description",
	LEFT(COALESCE("seo_title", "name"), 70),
	LEFT(COALESCE("seo_description", COALESCE("description", '')), 160),
	'{"tags":[]}'::jsonb,
	"created_at",
	"updated_at"
FROM "categories"
WHERE NOT EXISTS (
	SELECT 1 FROM "category_translations" AS t WHERE t."category_id" = "categories"."id" AND t."locale" = 'en'
);
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN IF EXISTS "name";
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN IF EXISTS "slug";
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN IF EXISTS "description";
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN IF EXISTS "seo_title";
--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN IF EXISTS "seo_description";
--> statement-breakpoint
DROP INDEX IF EXISTS "categories_slug_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "category_translations_category_locale_unique" ON "category_translations" USING btree ("category_id","locale");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "category_translations_slug_locale_unique" ON "category_translations" USING btree ("slug","locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_translations_category_id_idx" ON "category_translations" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_id_idx" ON "categories" USING btree ("parent_id");
