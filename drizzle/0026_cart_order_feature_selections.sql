ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "configuration_key" varchar(64) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "feature_selections" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "feature_selections" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "cart_items_unique_line";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_unique_line" ON "cart_items" ("cart_id", "product_id", "configuration_key");
