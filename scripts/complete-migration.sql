-- ==========================================
-- Database Migration Script
-- StepMotech Product Images Enhancement
-- ==========================================

-- 1. Add is_dimension column to product_images
DO $$ BEGIN
  ALTER TABLE "product_images" ADD COLUMN "is_dimension" boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN 
  RAISE NOTICE 'Column is_dimension already exists, skipping...';
END $$;

-- 2. Add image_type column to product_images  
DO $$ BEGIN
  ALTER TABLE "product_images" ADD COLUMN "image_type" varchar(50) NOT NULL DEFAULT 'gallery';
EXCEPTION WHEN duplicate_column THEN 
  RAISE NOTICE 'Column image_type already exists, skipping...';
END $$;

-- 3. Verify migration
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'product_images' 
  AND column_name IN ('is_dimension', 'image_type')
ORDER BY column_name;

-- 4. Show database statistics
SELECT 'products' as table_name, count(*) as record_count FROM products
UNION ALL
SELECT 'product_images', count(*) FROM product_images
UNION ALL  
SELECT 'product_features', count(*) FROM product_features
UNION ALL
SELECT 'attachments', count(*) FROM attachments
UNION ALL
SELECT 'product_relations', count(*) FROM product_relations
ORDER BY table_name;
