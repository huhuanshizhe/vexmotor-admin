ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "board_key" varchar(100);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_settings" (
  "id" varchar(32) PRIMARY KEY NOT NULL,
  "coverage_boards" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_board_assignments" (
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE cascade,
  "board_key" varchar(100) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_board_assignments_pk" PRIMARY KEY("product_id", "board_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_board_assignments_board_key_idx" ON "product_board_assignments" ("board_key");
