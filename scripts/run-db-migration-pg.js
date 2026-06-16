// Pure Node.js script to run migration
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_ZaA1Ruz9TUFv@ep-curly-field-a6wk13j5-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require'
});

async function migrate() {
  console.log('🚀 Starting database migration...\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Add is_dimension column
    console.log('1️⃣  Adding is_dimension column to product_images...');
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "product_images" ADD COLUMN "is_dimension" boolean NOT NULL DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column is_dimension already exists';
      END $$;
    `);
    console.log('✅ is_dimension column added\n');

    // 2. Add image_type column
    console.log('2️⃣  Adding image_type column to product_images...');
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE "product_images" ADD COLUMN "image_type" varchar(50) NOT NULL DEFAULT 'gallery';
      EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'Column image_type already exists';
      END $$;
    `);
    console.log('✅ image_type column added\n');

    // 3. Verify columns
    console.log('3️⃣  Verifying columns...');
    const columns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'product_images' 
        AND column_name IN ('is_dimension', 'image_type')
      ORDER BY column_name;
    `);
    
    console.log('✅ Migration complete! New columns in product_images table:');
    columns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
    });

    // 4. Check current data
    console.log('\n📊 Current database statistics:');
    
    const productCount = await client.query('SELECT count(*) FROM products');
    console.log(`   Total products: ${productCount.rows[0].count}`);

    const imageCount = await client.query('SELECT count(*) FROM product_images');
    console.log(`   Total product images: ${imageCount.rows[0].count}`);

    const featureCount = await client.query('SELECT count(*) FROM product_features');
    console.log(`   Total product features: ${featureCount.rows[0].count}`);

    const attachmentCount = await client.query('SELECT count(*) FROM attachments');
    console.log(`   Total attachments: ${attachmentCount.rows[0].count}`);

    console.log('\n✅ Database migration completed successfully!');
    console.log('\n💡 Next step: Run data import with: node scripts/import-vexmotor-data.js');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
