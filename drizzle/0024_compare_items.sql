CREATE TABLE IF NOT EXISTS "compare_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE cascade,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "compare_items_user_product_unique" ON "compare_items" ("user_id", "product_id");
