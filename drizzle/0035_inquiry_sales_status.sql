DO $$ BEGIN
  CREATE TYPE "inquiry_sales_status" AS ENUM('unset', 'following', 'negotiating', 'won', 'lost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "sales_status" "inquiry_sales_status" DEFAULT 'unset' NOT NULL;
