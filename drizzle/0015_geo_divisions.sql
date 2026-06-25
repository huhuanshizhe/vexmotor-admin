DO $$ BEGIN
 CREATE TYPE "public"."geo_division_level" AS ENUM('country', 'admin1', 'admin2', 'admin3', 'locality', 'postal');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "geo_divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"level" "geo_division_level" NOT NULL,
	"code" varchar(32) NOT NULL,
	"iso_alpha2" varchar(2),
	"iso_alpha3" varchar(3),
	"continent_code" varchar(32),
	"name_en" varchar(200) NOT NULL,
	"name_zh" varchar(200),
	"name_native" varchar(200),
	"name_en_title" varchar(200) NOT NULL,
	"postal_code" varchar(32),
	"postal_code_pattern" varchar(120),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "geo_divisions" ADD CONSTRAINT "geo_divisions_parent_id_geo_divisions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."geo_divisions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "geo_divisions_parent_code_unique" ON "geo_divisions" USING btree ("parent_id","code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_divisions_parent_idx" ON "geo_divisions" USING btree ("parent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_divisions_level_idx" ON "geo_divisions" USING btree ("level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "geo_divisions_continent_idx" ON "geo_divisions" USING btree ("continent_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "geo_divisions_iso_alpha2_unique" ON "geo_divisions" USING btree ("iso_alpha2");
