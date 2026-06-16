-- Migration: Add new columns to product_images table
-- Add is_dimension and image_type fields

-- Add is_dimension column (ignore if exists)
DO $$ BEGIN
  ALTER TABLE "product_images" ADD COLUMN "is_dimension" boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN 
  RAISE NOTICE 'Column is_dimension already exists';
END $$;

-- Add image_type column (ignore if exists)
DO $$ BEGIN
  ALTER TABLE "product_images" ADD COLUMN "image_type" varchar(50) NOT NULL DEFAULT 'gallery';
EXCEPTION WHEN duplicate_column THEN 
  RAISE NOTICE 'Column image_type already exists';
END $$;

-- Verify the columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'product_images' 
  AND column_name IN ('is_dimension', 'image_type')
ORDER BY column_name;
