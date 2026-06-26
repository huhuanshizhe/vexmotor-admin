ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "locale" varchar(16) NOT NULL DEFAULT 'en';
--> statement-breakpoint
UPDATE "orders" SET "locale" = 'en' WHERE "locale" IS NULL OR trim("locale") = '';
