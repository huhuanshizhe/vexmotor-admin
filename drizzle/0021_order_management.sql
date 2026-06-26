-- Order management refactor: multi-dimensional status + shipments + coupons + refunds + action logs

CREATE TYPE "payment_status" AS ENUM('unpaid', 'paid');
--> statement-breakpoint
CREATE TYPE "shipping_status" AS ENUM('unshipped', 'shipped', 'delivered');
--> statement-breakpoint
CREATE TYPE "refund_status" AS ENUM('none', 'pending', 'refunded', 'partially_refunded');
--> statement-breakpoint
CREATE TYPE "refund_type" AS ENUM('full_refund', 'partial_refund', 'no_refund');
--> statement-breakpoint
CREATE TYPE "return_type" AS ENUM('return_goods', 'no_return');
--> statement-breakpoint
CREATE TYPE "order_action_type" AS ENUM('status_change', 'shipment_added', 'refund_processed', 'terminated', 'note_updated', 'completed');
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "payment_status" NOT NULL DEFAULT 'unpaid';
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_status" "shipping_status" NOT NULL DEFAULT 'unshipped';
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_status" "refund_status" NOT NULL DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "internal_note" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "terminated_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "terminated_by" uuid REFERENCES "admins"("id") ON DELETE SET NULL;
--> statement-breakpoint
UPDATE "orders" SET
  "payment_status" = CASE
    WHEN "status"::text IN ('paid', 'processing', 'shipped', 'completed', 'refunded') THEN 'paid'::"payment_status"
    ELSE 'unpaid'::"payment_status"
  END,
  "shipping_status" = CASE
    WHEN "status"::text IN ('shipped', 'completed', 'refunded') THEN 'shipped'::"shipping_status"
    ELSE 'unshipped'::"shipping_status"
  END,
  "refund_status" = CASE
    WHEN "status"::text = 'refunded' THEN 'refunded'::"refund_status"
    ELSE 'none'::"refund_status"
  END;
--> statement-breakpoint
CREATE TYPE "order_status_new" AS ENUM(
  'unpaid',
  'pending_processing',
  'partially_shipped',
  'shipped',
  'completed',
  'cancelled',
  'terminated'
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "status_new" "order_status_new";
--> statement-breakpoint
UPDATE "orders" SET "status_new" = CASE "status"::text
  WHEN 'pending' THEN 'unpaid'
  WHEN 'paid' THEN 'pending_processing'
  WHEN 'processing' THEN 'pending_processing'
  WHEN 'shipped' THEN 'shipped'
  WHEN 'completed' THEN 'completed'
  WHEN 'cancelled' THEN 'cancelled'
  WHEN 'refunded' THEN 'completed'
  ELSE 'unpaid'
END::"order_status_new";
--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "status";
--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "status_new" TO "status";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'unpaid';
--> statement-breakpoint
DROP TYPE "order_status";
--> statement-breakpoint
ALTER TYPE "order_status_new" RENAME TO "order_status";
--> statement-breakpoint
CREATE TABLE "order_shipments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "tracking_number" varchar(120) NOT NULL,
  "shipped_at" timestamp with time zone NOT NULL,
  "note" text,
  "admin_id" uuid REFERENCES "admins"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_shipment_items" (
  "shipment_id" uuid NOT NULL REFERENCES "order_shipments"("id") ON DELETE CASCADE,
  "order_item_id" uuid NOT NULL REFERENCES "order_items"("id") ON DELETE CASCADE,
  "quantity" integer,
  CONSTRAINT "order_shipment_items_pk" PRIMARY KEY("shipment_id", "order_item_id")
);
--> statement-breakpoint
CREATE TABLE "order_coupon_redemptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "coupon_id" uuid REFERENCES "coupons"("id") ON DELETE SET NULL,
  "coupon_code" varchar(64) NOT NULL,
  "coupon_name" varchar(255),
  "discount_type" varchar(32) NOT NULL,
  "discount_value" numeric(12, 4) DEFAULT '0' NOT NULL,
  "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
  "scope_summary" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_refund_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "refund_type" "refund_type" NOT NULL,
  "return_type" "return_type" NOT NULL,
  "reason" text,
  "requested_amount" numeric(12, 2),
  "processed_at" timestamp with time zone,
  "processed_by" uuid REFERENCES "admins"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_action_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "action_type" "order_action_type" NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "admin_id" uuid REFERENCES "admins"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "order_shipments_order_id_idx" ON "order_shipments" ("order_id");
--> statement-breakpoint
CREATE INDEX "order_action_logs_order_id_idx" ON "order_action_logs" ("order_id", "created_at");
--> statement-breakpoint
CREATE INDEX "order_refund_requests_order_id_idx" ON "order_refund_requests" ("order_id");
