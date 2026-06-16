import { NextResponse } from 'next/server';
import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!db) {
    return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
  }

  try {
    // 1. Create enum (ignore if exists)
    await db.execute(`
      DO $$ BEGIN
        CREATE TYPE "public"."product_relation_type" AS ENUM('drivers', 'mechanical-integration', 'power-control', 'custom');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // 2. Create table (ignore if exists)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "product_relations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "product_id" uuid NOT NULL,
        "related_product_id" uuid NOT NULL,
        "relation_type" "product_relation_type" DEFAULT 'custom' NOT NULL,
        "relation_label" varchar(100),
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    // 2.1 Add new columns to product_images if they don't exist
    await db.execute(`
      DO $$ BEGIN
        ALTER TABLE "product_images" ADD COLUMN "is_dimension" boolean NOT NULL DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN null; END $$;
    `);

    await db.execute(`
      DO $$ BEGIN
        ALTER TABLE "product_images" ADD COLUMN "image_type" varchar(50) NOT NULL DEFAULT 'gallery';
      EXCEPTION WHEN duplicate_column THEN null; END $$;
    `);

    // 3. Add foreign keys
    await db.execute(`
      DO $$ BEGIN
        ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_products_id_fk" 
          FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await db.execute(`
      DO $$ BEGIN
        ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_product_id_products_id_fk" 
          FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE cascade;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // 4. Create indexes
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "product_relations_unique" ON "product_relations" USING btree ("product_id","related_product_id");`);
    await db.execute(`CREATE INDEX IF NOT EXISTS "product_relations_product_idx" ON "product_relations" USING btree ("product_id","sort_order");`);

    // 5. Verify
    const result = await db.execute(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'product_relations' 
      ORDER BY ordinal_position
    `);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      columns: result.map((row: any) => row.column_name),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Migration failed', details: err.message },
      { status: 500 }
    );
  }
}
