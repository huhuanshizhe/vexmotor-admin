DO $$ BEGIN
 CREATE TYPE "public"."inquiry_queue_kind" AS ENUM('new_inquiry', 'customer_replied');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."inquiry_message_sender_type" AS ENUM('customer', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "awaiting_admin" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "queue_kind" "inquiry_queue_kind";
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "terminated_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "terminated_by" uuid;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "last_message_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inquiry_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"sender_type" "inquiry_message_sender_type" NOT NULL,
	"admin_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiry_messages" ADD CONSTRAINT "inquiry_messages_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_terminated_by_admins_id_fk" FOREIGN KEY ("terminated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inquiries_awaiting_admin_idx" ON "inquiries" USING btree ("awaiting_admin");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inquiries_last_message_at_idx" ON "inquiries" USING btree ("last_message_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inquiry_messages_inquiry_created_idx" ON "inquiry_messages" USING btree ("inquiry_id", "created_at");
--> statement-breakpoint
UPDATE "inquiries"
SET
  "last_message_at" = COALESCE("last_message_at", "created_at"),
  "awaiting_admin" = CASE WHEN "status" = 'new' THEN true ELSE false END,
  "queue_kind" = CASE WHEN "status" = 'new' THEN 'new_inquiry'::"inquiry_queue_kind" ELSE NULL END
WHERE "last_message_at" IS NULL OR "queue_kind" IS NULL;
--> statement-breakpoint
INSERT INTO "inquiry_messages" ("inquiry_id", "sender_type", "body", "created_at")
SELECT i."id", 'customer'::"inquiry_message_sender_type", i."message", i."created_at"
FROM "inquiries" i
WHERE NOT EXISTS (
  SELECT 1 FROM "inquiry_messages" m WHERE m."inquiry_id" = i."id"
);
