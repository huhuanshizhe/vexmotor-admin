DROP TABLE IF EXISTS "product_features";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_feature_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "definition_id" uuid NOT NULL REFERENCES "feature_definitions"("id") ON DELETE RESTRICT,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_feature_assignments_product_definition_unique"
  ON "product_feature_assignments" ("product_id", "definition_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_feature_assignments_product_id_idx"
  ON "product_feature_assignments" ("product_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_feature_values" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "assignment_id" uuid NOT NULL REFERENCES "product_feature_assignments"("id") ON DELETE CASCADE,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_feature_values_assignment_id_idx"
  ON "product_feature_values" ("assignment_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_feature_value_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "value_id" uuid NOT NULL REFERENCES "product_feature_values"("id") ON DELETE CASCADE,
  "locale" varchar(16) NOT NULL,
  "value_text" text,
  "value_number" numeric(12, 4),
  "value_boolean" boolean,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_feature_value_translations_value_locale_unique"
  ON "product_feature_value_translations" ("value_id", "locale");
