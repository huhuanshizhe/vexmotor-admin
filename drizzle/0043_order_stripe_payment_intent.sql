ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" varchar(64);
CREATE INDEX IF NOT EXISTS "orders_stripe_payment_intent_idx" ON "orders" ("stripe_payment_intent_id");
