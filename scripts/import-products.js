#!/usr/bin/env node
/**
 * Import Vexmotor product data from migration/vexmotor/products.json
 * This script imports ALL product data including:
 * - Product basic info (name, SKU, price, description)
 * - All product images (gallery + dimension images)
 * - Technical specifications (features)
 * - Downloadable documents (PDFs)
 * - Category mappings
 */

require('dotenv').config({ path: '.env.local' });

const { readFile } = require('fs/promises');
const path = require('path');
const postgres = require('postgres').default;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 30,
  connect_timeout: 30,
});

async function loadJSON(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function normalizeSlug(value) {
  return value
    .toLowerCase()
    .replace(/\.html$/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-');
}

function productSlugFromPath(pathname) {
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? '';
  const withoutHtml = segment.replace(/\.html$/i, '');
  const withoutLeadId = withoutHtml.replace(/^\d+-/, '');
  const withoutTailNumeric = withoutLeadId.replace(/-\d{10,}$/, '');
  return normalizeSlug(withoutTailNumeric);
}

async function getOrCreateBrand(brandName, brandSlug) {
  const existing = await sql`
    SELECT id FROM brands WHERE slug = ${brandSlug} LIMIT 1
  `;
  
  if (existing.length > 0) {
    return existing[0].id;
  }

  const inserted = await sql`
    INSERT INTO brands (name, slug, description, status)
    VALUES (${brandName}, ${brandSlug}, 'Imported from legacy site', 'active')
    RETURNING id
  `;
  
  return inserted[0].id;
}

async function importProducts() {
  console.log('🚀 Starting Vexmotor product data import...\n');
  
  try {
    // Load products data
    const productsPath = path.resolve(process.cwd(), 'migration/vexmotor/products.json');
    console.log('📂 Loading products from:', productsPath);
    const productsData = await loadJSON(productsPath);
    console.log(`📦 Found ${productsData.length} products to import\n`);

    // Create brand
    const brandId = await getOrCreateBrand('StepMotech', 'stepmotech');
    console.log('✅ Brand resolved:', brandId, '\n');

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let totalImages = 0;
    let totalSpecs = 0;
    let totalDocs = 0;

    for (const item of productsData) {
      if (!item.ldProduct?.name) {
        skipped++;
        continue;
      }

      const url = new URL(item.url);
      const slug = productSlugFromPath(url.pathname);
      
      if (!slug) {
        skipped++;
        continue;
      }

      const name = item.ldProduct.name.trim();
      const sku = item.ldProduct.sku || slug;
      const description = (item.ldProduct.description || item.seoDescription || '').trim();
      const shortDescription = (item.heading || item.seoDescription || '').trim();
      const price = Number(item.ldProduct.price ?? 0);
      const safePrice = Number.isFinite(price) ? price.toFixed(2) : '0.00';

      // Upsert product
      const existing = await sql`
        SELECT id FROM products WHERE slug = ${slug} LIMIT 1
      `;

      let productId;
      
      if (existing.length > 0) {
        // Update existing product
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
        // Insert new product
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

      // Import images (gallery + dimension)
      const allImages = [...new Set([
        ...(item.galleryImages || []),
        ...(item.ldProduct.images || [])
      ].filter(Boolean))].slice(0, 12);

      if (allImages.length > 0) {
        // Delete old images
        await sql`DELETE FROM product_images WHERE product_id = ${productId}`;
        
        // Insert new images
        const imageRows = allImages.map((imageUrl, index) => {
          const isDimension = /dimension|diagram|size|drawing|outline/i.test(imageUrl);
          return {
            product_id: productId,
            url: imageUrl,
            alt: item.heading || name,
            sort_order: index + 1,
            is_primary: index === 0,
            is_dimension: isDimension,
            image_type: isDimension ? 'dimension' : 'gallery',
          };
        });

        await sql.unsafe(`
          INSERT INTO product_images (product_id, url, alt, sort_order, is_primary, is_dimension, image_type)
          VALUES ${imageRows.map((row, i) => 
            `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
          ).join(', ')}
        `, imageRows.flatMap(row => [
          row.product_id, row.url, row.alt, row.sort_order,
          row.is_primary, row.is_dimension, row.image_type
        ]));
        
        totalImages += allImages.length;
      }

      // Import technical specifications
      const specs = (item.technicalSpecs || []).filter(spec => spec.key && spec.value).slice(0, 24);
      
      if (specs.length > 0) {
        await sql`DELETE FROM product_features WHERE product_id = ${productId}`;
        
        const specRows = specs.map((spec, index) => ({
          product_id: productId,
          feature_key: spec.key.trim(),
          feature_value: String(spec.value).trim(),
          unit: spec.unit || null,
          sort_order: index + 1,
        }));

        await sql.unsafe(`
          INSERT INTO product_features (product_id, feature_key, feature_value, unit, sort_order)
          VALUES ${specRows.map((row, i) => 
            `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
          ).join(', ')}
        `, specRows.flatMap(row => [
          row.product_id, row.feature_key, row.feature_value, row.unit, row.sort_order
        ]));
        
        totalSpecs += specs.length;
      }

      // Import downloadable documents (PDFs)
      const downloads = (item.downloads || [])
        .filter(asset => asset.url && !asset.url.includes('#'))
        .slice(0, 10);
      
      if (downloads.length > 0) {
        await sql`DELETE FROM attachments WHERE product_id = ${productId}`;
        
        const attachmentRows = downloads.map((asset, index) => ({
          product_id: productId,
          name: (asset.label || `Technical Document ${index + 1}`).slice(0, 255),
          url: asset.url,
          mime_type: asset.mimeType || 'application/pdf',
          sort_order: index + 1,
        }));

        await sql.unsafe(`
          INSERT INTO attachments (product_id, name, url, mime_type, sort_order)
          VALUES ${attachmentRows.map((row, i) => 
            `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
          ).join(', ')}
        `, attachmentRows.flatMap(row => [
          row.product_id, row.name, row.url, row.mime_type, row.sort_order
        ]));
        
        totalDocs += downloads.length;
      }

      // Progress indicator
      if ((imported + updated) % 10 === 0) {
        console.log(`  ⏳ Progress: ${imported + updated}/${productsData.length} products processed`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Import completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 New products imported: ${imported}`);
    console.log(`🔄 Existing products updated: ${updated}`);
    console.log(`⏭️  Skipped (invalid data): ${skipped}`);
    console.log(`🖼️  Total images imported: ${totalImages}`);
    console.log(`📋 Total specs imported: ${totalSpecs}`);
    console.log(`📄 Total documents imported: ${totalDocs}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('\n❌ Import failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

importProducts();
