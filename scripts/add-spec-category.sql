-- Add spec_category column to product_features
ALTER TABLE product_features ADD COLUMN IF NOT EXISTS spec_category VARCHAR(50) DEFAULT 'general';

-- Add description_long column to products for full description
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_long TEXT;

-- Add index for better querying
CREATE INDEX IF NOT EXISTS product_features_category_idx ON product_features(product_id, spec_category);

COMMENT ON COLUMN product_features.spec_category IS 'Category: electrical, mechanical, performance, environmental, general';
COMMENT ON COLUMN products.description_long IS 'Full detailed product description for professional display';
