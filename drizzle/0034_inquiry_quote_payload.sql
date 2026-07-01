ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "quote_number" varchar(32);
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "rfq_payload" jsonb;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "quoted_lines" jsonb;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inquiries_quote_number_unique" ON "inquiries" ("quote_number");
