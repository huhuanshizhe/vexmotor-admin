CREATE TABLE IF NOT EXISTS "editorial_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" "editorial_content_type" DEFAULT 'content' NOT NULL,
	"board_key" varchar(100) DEFAULT 'content' NOT NULL,
	"status" "cms_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "editorial_content_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"content_type" "editorial_content_type" DEFAULT 'content' NOT NULL,
	"locale" varchar(16) DEFAULT 'en-US' NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"summary" text,
	"seo_title" varchar(255),
	"seo_description" varchar(500),
	"payload" jsonb DEFAULT '{"body":"","coverUrl":null,"coverAlt":null,"tags":[],"relatedProductSlugs":[]}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "editorial_content_translations" ADD CONSTRAINT "editorial_content_translations_content_id_editorial_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."editorial_contents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "editorial_content_translations_content_locale_unique" ON "editorial_content_translations" USING btree ("content_id","locale");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "editorial_content_translations_type_slug_locale_unique" ON "editorial_content_translations" USING btree ("content_type","slug","locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editorial_content_translations_content_id_idx" ON "editorial_content_translations" USING btree ("content_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editorial_contents_type_status_published_idx" ON "editorial_contents" USING btree ("content_type","status","published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editorial_contents_board_key_idx" ON "editorial_contents" USING btree ("board_key");
--> statement-breakpoint
INSERT INTO "editorial_contents" ("id", "content_type", "board_key", "status", "published_at", "created_at", "updated_at")
SELECT DISTINCT ON (COALESCE("translation_group_id", "id"))
	COALESCE("translation_group_id", "id") AS "id",
	"content_type",
	"board_key",
	"status",
	"published_at",
	"created_at",
	"updated_at"
FROM "editorial_content_entries"
ORDER BY COALESCE("translation_group_id", "id"),
	CASE "status" WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
	"updated_at" DESC
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "editorial_content_translations" (
	"id",
	"content_id",
	"content_type",
	"locale",
	"title",
	"slug",
	"summary",
	"seo_title",
	"seo_description",
	"payload",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	COALESCE("translation_group_id", "id") AS "content_id",
	"content_type",
	"locale",
	"title",
	"slug",
	"summary",
	"seo_title",
	"seo_description",
	"payload",
	"created_at",
	"updated_at"
FROM "editorial_content_entries"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
DROP TABLE IF EXISTS "editorial_content_entries";
