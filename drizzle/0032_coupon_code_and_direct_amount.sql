ALTER TYPE "coupon_discount_type" ADD VALUE IF NOT EXISTS 'direct_amount';

ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "code" varchar(64);

UPDATE "coupons" SET "code" = "coupon_key" WHERE "code" IS NULL;

ALTER TABLE "coupons" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_unique" ON "coupons" ("code");
