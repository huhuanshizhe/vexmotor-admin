DO $$ BEGIN
 CREATE TYPE "public"."coupon_status" AS ENUM('active', 'inactive');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."coupon_scope" AS ENUM('all', 'category', 'brand', 'product');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."coupon_discount_type" AS ENUM('percent', 'fixed_amount', 'special_price');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."coupon_grant_source" AS ENUM('admin_send', 'registration', 'self_claim');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."coupon_distribution_target_mode" AS ENUM('all_customers', 'selected_customers');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotion_settings" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"default_currency_code" varchar(3) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "promotion_settings" ("id", "default_currency_code")
VALUES ('default', 'USD')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"coupon_key" varchar(64) NOT NULL,
	"scope" "coupon_scope" NOT NULL,
	"stackable" boolean DEFAULT false NOT NULL,
	"discount_type" "coupon_discount_type" NOT NULL,
	"threshold_amount" numeric(12, 2),
	"discount_value" numeric(12, 4) NOT NULL,
	"max_discount_amount" numeric(12, 2),
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" "coupon_status" DEFAULT 'inactive' NOT NULL,
	"note" text,
	"total_quota" integer,
	"issued_quantity" integer DEFAULT 0 NOT NULL,
	"per_user_limit" integer,
	"grant_on_register" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_coupon_key_unique" ON "coupons" USING btree ("coupon_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_status_dates_idx" ON "coupons" USING btree ("status", "starts_at", "ends_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_categories" (
	"coupon_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "coupon_categories_coupon_id_category_id_pk" PRIMARY KEY("coupon_id","category_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_brands" (
	"coupon_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	CONSTRAINT "coupon_brands_coupon_id_brand_id_pk" PRIMARY KEY("coupon_id","brand_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_products" (
	"coupon_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "coupon_products_coupon_id_product_id_pk" PRIMARY KEY("coupon_id","product_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_distribution_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"target_mode" "coupon_distribution_target_mode" NOT NULL,
	"quantity_per_user" integer NOT NULL,
	"recipient_count" integer NOT NULL,
	"total_quantity" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"source" "coupon_grant_source" NOT NULL,
	"batch_id" uuid,
	"admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_categories" ADD CONSTRAINT "coupon_categories_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_categories" ADD CONSTRAINT "coupon_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_brands" ADD CONSTRAINT "coupon_brands_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_brands" ADD CONSTRAINT "coupon_brands_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_products" ADD CONSTRAINT "coupon_products_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_products" ADD CONSTRAINT "coupon_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_distribution_batches" ADD CONSTRAINT "coupon_distribution_batches_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_distribution_batches" ADD CONSTRAINT "coupon_distribution_batches_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_grants" ADD CONSTRAINT "coupon_grants_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_grants" ADD CONSTRAINT "coupon_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_grants" ADD CONSTRAINT "coupon_grants_batch_id_coupon_distribution_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."coupon_distribution_batches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coupon_grants" ADD CONSTRAINT "coupon_grants_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_grants_coupon_created_idx" ON "coupon_grants" USING btree ("coupon_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_grants_coupon_user_idx" ON "coupon_grants" USING btree ("coupon_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_grants_batch_idx" ON "coupon_grants" USING btree ("batch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_distribution_batches_coupon_created_idx" ON "coupon_distribution_batches" USING btree ("coupon_id", "created_at");
