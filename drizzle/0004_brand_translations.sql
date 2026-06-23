CREATE TABLE IF NOT EXISTS "brand_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
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
 ALTER TABLE "brand_translations" ADD CONSTRAINT "brand_translations_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "brand_translations" ("brand_id", "locale", "name", "slug", "description", "seo_title", "seo_description", "payload", "created_at", "updated_at")
SELECT
	"id",
	'en',
	"name",
	"slug",
	"description",
	"name",
	LEFT(COALESCE("description", ''), 160),
	'{"tags":[]}'::jsonb,
	"created_at",
	"updated_at"
FROM "brands"
WHERE NOT EXISTS (
	SELECT 1 FROM "brand_translations" AS t WHERE t."brand_id" = "brands"."id" AND t."locale" = 'en'
);
--> statement-breakpoint
ALTER TABLE "brands" DROP COLUMN IF EXISTS "name";
--> statement-breakpoint
ALTER TABLE "brands" DROP COLUMN IF EXISTS "slug";
--> statement-breakpoint
ALTER TABLE "brands" DROP COLUMN IF EXISTS "description";
--> statement-breakpoint
DROP INDEX IF EXISTS "brands_slug_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "brand_translations_brand_locale_unique" ON "brand_translations" USING btree ("brand_id","locale");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "brand_translations_slug_locale_unique" ON "brand_translations" USING btree ("slug","locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brand_translations_brand_id_idx" ON "brand_translations" USING btree ("brand_id");
