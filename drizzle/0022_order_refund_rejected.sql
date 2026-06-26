ALTER TYPE "refund_status" ADD VALUE IF NOT EXISTS 'refund_rejected';
--> statement-breakpoint
ALTER TABLE "order_refund_requests" ADD COLUMN IF NOT EXISTS "processed_amount" numeric(12, 2);
