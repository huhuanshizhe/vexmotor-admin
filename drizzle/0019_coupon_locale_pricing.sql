CREATE TABLE IF NOT EXISTS "coupon_locale_pricing" (
	"coupon_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"threshold_amount" numeric(12, 2),
	"discount_value" numeric(12, 4) NOT NULL,
	"max_discount_amount" numeric(12, 2),
	CONSTRAINT "coupon_locale_pricing_coupon_id_locale_pk" PRIMARY KEY("coupon_id","locale")
);
--> statement-breakpoint
INSERT INTO "coupon_locale_pricing" ("coupon_id", "locale", "threshold_amount", "discount_value", "max_discount_amount")
SELECT
	c."id",
	sl."code",
	c."threshold_amount",
	c."discount_value",
	c."max_discount_amount"
FROM "coupons" c
CROSS JOIN "site_languages" sl
WHERE sl."status" = 'active'
ON CONFLICT ("coupon_id", "locale") DO NOTHING;
--> statement-breakpoint
INSERT INTO "coupon_locale_pricing" ("coupon_id", "locale", "threshold_amount", "discount_value", "max_discount_amount")
SELECT
	c."id",
	'en',
	c."threshold_amount",
	c."discount_value",
	c."max_discount_amount"
FROM "coupons" c
WHERE NOT EXISTS (
	SELECT 1 FROM "coupon_locale_pricing" clp WHERE clp."coupon_id" = c."id"
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_locale_pricing" ADD CONSTRAINT "coupon_locale_pricing_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_locale_pricing_coupon_id_idx" ON "coupon_locale_pricing" USING btree ("coupon_id");
--> statement-breakpoint
ALTER TABLE "coupons" DROP COLUMN IF EXISTS "threshold_amount";
--> statement-breakpoint
ALTER TABLE "coupons" DROP COLUMN IF EXISTS "discount_value";
--> statement-breakpoint
ALTER TABLE "coupons" DROP COLUMN IF EXISTS "max_discount_amount";
