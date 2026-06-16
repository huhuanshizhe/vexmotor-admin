/**
 * Full database import script - imports ALL 123 products
 */
require('dotenv').config({ path: '.env.local' });

const { readFile, writeFile } = require('fs/promises');
const path = require('path');

let postgres;
try {
  postgres = require('postgres');
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

async function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  await writeFile(logFile, line + '\n', { flag: 'a' });
}

async function run() {
  await writeFile(logFile, '', 'utf8');
  
  await log('🚀 Starting FULL database import...');
  
  if (!DATABASE_URL) {
    await log('❌ DATABASE_URL not configured');
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, {
    max: 2,
    idle_timeout: 30,
    connect_timeout: 30,
  });

  try {
    await log('✅ Database connection established');

    // Load products
    const productsPath = path.resolve(process.cwd(), 'migration/vexmotor/products.json');
    const content = await readFile(productsPath, 'utf8');
    const productsData = JSON.parse(content);
    await log(`📦 Found ${productsData.length} products to import`);

    // Get or create brand
    const brandResult = await sql`SELECT id FROM brands WHERE slug = 'stepmotech' LIMIT 1`;
    let brandId;
    
    if (brandResult.length === 0) {
      const inserted = await sql`
        INSERT INTO brands (name, slug, description, status)
        VALUES ('StepMotech', 'stepmotech', 'Imported from legacy site', 'active')
        RETURNING id
      `;
      brandId = inserted[0].id;
      await log(`✅ Created new brand`);
    } else {
      brandId = brandResult[0].id;
      await log(`✅ Using existing brand`);
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let totalImages = 0;
    let totalSpecs = 0;
    let totalDocs = 0;

    // Import ALL products
    for (let i = 0; i < productsData.length; i++) {
      const item = productsData[i];

      if (!item.ldProduct?.name) {
        skipped++;
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

      const name = item.ldProduct.name.trim();
      const description = (item.ldProduct.description || item.seoDescription || '').trim();
      const shortDescription = (item.heading || item.seoDescription || '').trim();
      const price = Number(item.ldProduct.price ?? 0);
      const safePrice = Number.isFinite(price) ? price.toFixed(2) : '0.00';

      // Check existing product first
      const existing = await sql`SELECT id FROM products WHERE slug = ${slug} LIMIT 1`;
      let productId = existing.length > 0 ? existing[0].id : null;

      // Handle unique SKU
      let sku = item.ldProduct.sku || slug;
      let skuAttempt = 0;
      while (skuAttempt < 10) {
        const existingSku = await sql`SELECT id FROM products WHERE sku = ${sku} LIMIT 1`;
        if (existingSku.length === 0 || (productId && existingSku[0].id === productId)) {
          break; // SKU is unique or belongs to this product
        }
        skuAttempt++;
        sku = `${item.ldProduct.sku || slug}-${skuAttempt}`;
      }

      // Upsert product

      if (existing.length > 0) {
        productId = existing[0].id;
        await sql`
          UPDATE products SET
            brand_id = ${brandId},
            name = ${name},
            sku = ${sku},
            short_description = ${shortDescription || null},
            description = ${description || null},
            price = ${safePrice},
            currency_code = ${item.ldProduct.currency || 'USD'},
            seo_title = ${item.seoTitle || item.title || name},
            seo_description = ${item.seoDescription || null},
            status = 'active',
            published_at = NOW(),
            updated_at = NOW()
          WHERE id = ${productId}
        `;
        updated++;
      } else {
        const inserted = await sql`
          INSERT INTO products (
            brand_id, name, slug, sku, short_description, description,
            purchase_mode, status, price, currency_code, stock_quantity,
            featured, seo_title, seo_description, published_at
          ) VALUES (
            ${brandId}, ${name}, ${slug}, ${sku},
            ${shortDescription || null}, ${description || null},
            'buy', 'active', ${safePrice}, ${item.ldProduct.currency || 'USD'},
            100, false, ${item.seoTitle || item.title || name},
            ${item.seoDescription || null}, NOW()
          ) RETURNING id
        `;
        productId = inserted[0].id;
        imported++;
      }

      // Import ALL images
      const allImages = [...new Set([
        ...(item.galleryImages || []),
        ...(item.ldProduct.images || [])
      ].filter(Boolean))].slice(0, 12);

      if (allImages.length > 0) {
        await sql`DELETE FROM product_images WHERE product_id = ${productId}`;
        
        for (let j = 0; j < allImages.length; j++) {
          const imageUrl = allImages[j];
          const isDimension = /dimension|diagram|size|drawing|outline/i.test(imageUrl);

          await sql`
            INSERT INTO product_images (
              product_id, url, alt, sort_order, is_primary, is_dimension, image_type
            ) VALUES (
              ${productId}, ${imageUrl}, ${item.heading || name},
              ${j + 1}, ${j === 0}, ${isDimension}, ${isDimension ? 'dimension' : 'gallery'}
            )
          `;
        }
        
        totalImages += allImages.length;
      }

      // Import ALL specs
      const specs = (item.technicalSpecs || []).filter(s => s.key && s.value).slice(0, 24);
      
      if (specs.length > 0) {
        await sql`DELETE FROM product_features WHERE product_id = ${productId}`;
        
        for (let j = 0; j < specs.length; j++) {
          const spec = specs[j];
          await sql`
            INSERT INTO product_features (
              product_id, feature_key, feature_value, unit, sort_order
            ) VALUES (
              ${productId}, ${spec.key.trim()}, ${String(spec.value).trim()},
              ${spec.unit || null}, ${j + 1}
            )
          `;
        }
        
        totalSpecs += specs.length;
      }

      // Import ALL documents
      const downloads = (item.downloads || [])
        .filter(d => d.url && !d.url.includes('#'))
        .slice(0, 10);
      
      if (downloads.length > 0) {
        await sql`DELETE FROM attachments WHERE product_id = ${productId}`;
        
        for (let j = 0; j < downloads.length; j++) {
          const doc = downloads[j];
          await sql`
            INSERT INTO attachments (
              product_id, name, url, mime_type, sort_order
            ) VALUES (
              ${productId}, ${(doc.label || `Document ${j + 1}`).slice(0, 255)},
              ${doc.url}, ${doc.mimeType || 'application/pdf'}, ${j + 1}
            )
          `;
        }
        
        totalDocs += downloads.length;
      }

      // Progress every 10 products
      if ((imported + updated) % 10 === 0 || i === productsData.length - 1) {
        await log(`⏳ Progress: ${imported + updated}/${productsData.length} products`);
      }
    }

    await log('\n' + '='.repeat(60));
    await log('✅ FULL IMPORT COMPLETED SUCCESSFULLY');
    await log('='.repeat(60));
    await log(`📊 New products imported: ${imported}`);
    await log(`🔄 Existing products updated: ${updated}`);
    await log(`⏭️  Skipped: ${skipped}`);
    await log(`🖼️  Total images: ${totalImages}`);
    await log(`📋 Total specs: ${totalSpecs}`);
    await log(`📄 Total documents: ${totalDocs}`);
    await log('='.repeat(60));

  } catch (err) {
    await log(`\n❌ Import failed: ${err.message}`);
    await log(err.stack);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
