const postgres = require('postgres');

const sql = postgres('postgresql://neondb_owner:npg_ZaA1Ruz9TUFv@ep-curly-field-a6wk13j5-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require');

async function migrate() {
  console.log('🚀 Starting database migration...\n');

  try {
    // 1. Add is_dimension column
    console.log('1️⃣  Adding is_dimension column to product_images...');
    await sql`
      DO $$ BEGIN
        ALTER TABLE "product_images" ADD COLUMN "is_dimension" boolean NOT NULL DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column is_dimension already exists';
      END $$;
    `;
    console.log('✅ is_dimension column added\n');

    // 2. Add image_type column
    console.log('2️⃣  Adding image_type column to product_images...');
    await sql`
      DO $$ BEGIN
        ALTER TABLE "product_images" ADD COLUMN "image_type" varchar(50) NOT NULL DEFAULT 'gallery';
      EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column image_type already exists';
      END $$;
    `;
    console.log('✅ image_type column added\n');

    // 3. Verify columns
    console.log('3️⃣  Verifying columns...');
    const columns = await sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'product_images' 
        AND column_name IN ('is_dimension', 'image_type')
      ORDER BY column_name;
    `;
    
    console.log('✅ Migration complete! Columns in product_images table:');
    console.table(columns);

    // 4. Check current product count
    const productCount = await sql`SELECT count(*) FROM products`;
    console.log(`\n📊 Total products in database: ${productCount[0].count}`);

    const imageCount = await sql`SELECT count(*) FROM product_images`;
    console.log(`📊 Total product images: ${imageCount[0].count}`);

    const featureCount = await sql`SELECT count(*) FROM product_features`;
    console.log(`📊 Total product features: ${featureCount[0].count}`);

    const attachmentCount = await sql`SELECT count(*) FROM attachments`;
    console.log(`📊 Total attachments: ${attachmentCount[0].count}\n`);

    console.log('✅ Database migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
