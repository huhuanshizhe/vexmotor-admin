DO $$ BEGIN
  CREATE TYPE "address_type" AS ENUM('shipping', 'billing');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "address_type" "address_type" DEFAULT 'shipping' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "addresses_user_type_idx" ON "addresses" ("user_id", "address_type");
