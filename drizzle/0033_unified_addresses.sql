-- Unified address book: remove shipping/billing type distinction
DROP INDEX IF EXISTS "addresses_user_type_idx";
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "address_type";

CREATE INDEX IF NOT EXISTS "addresses_user_id_idx" ON "addresses" USING btree ("user_id");

DROP TYPE IF EXISTS "address_type";

-- Guest checkout + order address references
ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_address_id" uuid;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "billing_address_id" uuid;

DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_address_id_addresses_id_fk" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_billing_address_id_addresses_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
