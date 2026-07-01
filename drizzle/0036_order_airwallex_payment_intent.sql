ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "airwallex_payment_intent_id" varchar(64);
CREATE INDEX IF NOT EXISTS "orders_airwallex_payment_intent_idx" ON "orders" ("airwallex_payment_intent_id");
