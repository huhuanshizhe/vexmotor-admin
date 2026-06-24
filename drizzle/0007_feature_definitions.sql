CREATE TABLE IF NOT EXISTS "feature_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spec_category" varchar(50) DEFAULT 'general' NOT NULL,
	"name" varchar(150) NOT NULL,
	"value_type" varchar(20) DEFAULT 'text' NOT NULL,
	"select_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "brand_status" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feature_definition_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"value_text" varchar(255),
	"value_min" numeric(12, 4),
	"value_max" numeric(12, 4),
	"unit" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feature_definition_translations" ADD CONSTRAINT "feature_definition_translations_definition_id_feature_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."feature_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feature_definitions_category_name_unique" ON "feature_definitions" USING btree ("spec_category","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feature_definitions_status_idx" ON "feature_definitions" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feature_definition_translations_definition_locale_unique" ON "feature_definition_translations" USING btree ("definition_id","locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feature_definition_translations_definition_id_idx" ON "feature_definition_translations" USING btree ("definition_id");
