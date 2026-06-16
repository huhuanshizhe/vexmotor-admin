/**
 * Direct database import script - runs locally with full error reporting
 */
require('dotenv').config({ path: '.env.local' });

const { readFile, writeFile } = require('fs/promises');
const path = require('path');

// Import postgres - handle both ESM and CommonJS
let postgres;
try {
  postgres = require('postgres');
  // If it's an ES module default export
  if (typeof postgres !== 'function') {
    postgres = postgres.default;
  }
} catch (e) {
  console.error('❌ Failed to load postgres module');
  console.error(e.message);
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
const logFile = path.join(__dirname, 'import-full-log.txt');

async function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  await writeFile(logFile, line + '\n', { flag: 'a' });
}

async function run() {
  // Clear log file
  await writeFile(logFile, '', 'utf8');
  
  await log('🚀 Starting direct database import...');
  await log(`Database URL: ${DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  
  if (!DATABASE_URL) {
    await log('❌ DATABASE_URL not configured', 'error');
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, {
    max: 2,
    idle_timeout: 30,
    connect_timeout: 30,
  });

  try {
    // Test connection
    await log('🔌 Testing database connection...');
    const test = await sql`SELECT 1 as test`;
    await log(`✅ Database connected: ${JSON.stringify(test)}`);

    // Load products
    await log('📂 Loading products.json...');
    const productsPath = path.resolve(process.cwd(), 'migration/vexmotor/products.json');
    const content = await readFile(productsPath, 'utf8');
    const productsData = JSON.parse(content);
    await log(`📦 Found ${productsData.length} products to import`);

    // Get or create brand
    await log('🏷️  Resolving brand...');
    const brandResult = await sql`SELECT id FROM brands WHERE slug = 'stepmotech' LIMIT 1`;
    let brandId;
    
    if (brandResult.length === 0) {
      const inserted = await sql`
        INSERT INTO brands (name, slug, description, status)
        VALUES ('StepMotech', 'stepmotech', 'Imported from legacy site', 'active')
        RETURNING id
      `;
      brandId = inserted[0].id;
      await log(`✅ Created new brand: ${brandId}`);
    } else {
      brandId = brandResult[0].id;
      await log(`✅ Using existing brand: ${brandId}`);
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let totalImages = 0;
    let totalSpecs = 0;
    let totalDocs = 0;

    // Import first 5 products as test
    await log('\n🧪 Testing with first 5 products...');
    
    for (let i = 0; i < Math.min(5, productsData.length); i++) {
      const item = productsData[i];
      await log(`\n📦 Product ${i + 1}: ${item.ldProduct?.name || 'NO NAME'}`);

      if (!item.ldProduct?.name) {
        skipped++;
        await log('  ⏭️  Skipped (no name)');
        continue;
      }

      // Extract slug
      const url = new URL(item.url);
      const segment = url.pathname.split('/').filter(Boolean).at(-1) ?? '';
      const slug = segment
        .replace(/\.html$/i, '')
        .replace(/^\d+-/, '')
        .replace(/-\d{10,}$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-{2,}/g, '-');

      await log(`  📝 Slug: ${slug}`);
      await log(`  📊 Images: ${item.galleryImages?.length || 0}`);
      await log(`  📋 Specs: ${item.technicalSpecs?.length || 0}`);
      await log(`  📄 Docs: ${item.downloads?.length || 0}`);

      // Upsert product
      const existing = await sql`SELECT id FROM products WHERE slug = ${slug} LIMIT 1`;
      let productId;

      if (existing.length > 0) {
        productId = existing[0].id;
        await sql`
          UPDATE products SET
            brand_id = ${brandId},
            name = ${item.ldProduct.name.trim()},
            status = 'active',
            updated_at = NOW()
          WHERE id = ${productId}
        `;
        updated++;
        await log(`  🔄 Updated existing product`);
      } else {
        const inserted = await sql`
          INSERT INTO products (
            brand_id, name, slug, sku, status, published_at
          ) VALUES (
            ${brandId}, ${item.ldProduct.name.trim()}, ${slug},
            ${item.ldProduct.sku || slug}, 'active', NOW()
          ) RETURNING id
        `;
        productId = inserted[0].id;
        imported++;
        await log(`  ✅ Created new product: ${productId}`);
      }

      // Test inserting one image
      if (item.galleryImages && item.galleryImages.length > 0) {
        await sql`DELETE FROM product_images WHERE product_id = ${productId}`;
        
        await sql`
          INSERT INTO product_images (
            product_id, url, alt, sort_order, is_primary, is_dimension, image_type
          ) VALUES (
            ${productId}, ${item.galleryImages[0]}, ${item.heading || item.ldProduct.name},
            1, true, false, 'gallery'
          )
        `;
        totalImages++;
        await log(`  🖼️  Inserted 1 test image`);
      }

      // Test inserting one spec
      if (item.technicalSpecs && item.technicalSpecs.length > 0) {
        await sql`DELETE FROM product_features WHERE product_id = ${productId}`;
        
        const spec = item.technicalSpecs[0];
        await sql`
          INSERT INTO product_features (
            product_id, feature_key, feature_value, unit, sort_order
          ) VALUES (
            ${productId}, ${spec.key}, ${String(spec.value)}, ${spec.unit || null}, 1
          )
        `;
        totalSpecs++;
        await log(`  📋 Inserted 1 test spec`);
      }
    }

    await log('\n' + '='.repeat(60));
    await log('✅ TEST IMPORT COMPLETED SUCCESSFULLY');
    await log('='.repeat(60));
    await log(`📊 Test products imported: ${imported}`);
    await log(`🔄 Test products updated: ${updated}`);
    await log(`⏭️  Test products skipped: ${skipped}`);
    await log(`🖼️  Test images inserted: ${totalImages}`);
    await log(`📋 Test specs inserted: ${totalSpecs}`);
    await log('='.repeat(60));
    await log('\n💡 Ready for full import! Run the API endpoint:');
    await log('   POST https://stepmotech.online/api/admin/import-products');
    await log('\n📝 Full log saved to: scripts/import-full-log.txt');

  } catch (err) {
    await log(`\n❌ Import failed: ${err.message}`, 'error');
    await log(err.stack, 'error');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
