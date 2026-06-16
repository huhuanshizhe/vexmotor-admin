-- Create product_relation_type enum
DO $$ BEGIN
  CREATE TYPE product_relation_type AS ENUM ('drivers', 'mechanical-integration', 'power-control', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create product_relations table
CREATE TABLE IF NOT EXISTS product_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type product_relation_type NOT NULL DEFAULT 'custom',
  relation_label VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create unique index to prevent duplicate relations
CREATE UNIQUE INDEX IF NOT EXISTS product_relations_unique 
ON product_relations(product_id, related_product_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS product_relations_product_idx 
ON product_relations(product_id, sort_order);

-- Add comments
COMMENT ON TABLE product_relations IS 'Product relationship mappings for cross-selling and recommendations';
COMMENT ON COLUMN product_relations.relation_type IS 'Type of relation: drivers, mechanical-integration, power-control, custom';
COMMENT ON COLUMN product_relations.relation_label IS 'Display label for the relation (e.g., "Compatible Driver", "Same Series")';
