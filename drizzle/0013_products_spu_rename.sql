ALTER TABLE "products" RENAME COLUMN "sku" TO "spu";
--> statement-breakpoint
ALTER INDEX IF EXISTS "products_sku_unique" RENAME TO "products_spu_unique";
--> statement-breakpoint
ALTER TABLE "order_items" RENAME COLUMN "sku" TO "spu";
