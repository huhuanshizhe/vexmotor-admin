import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import postgres from 'postgres';

export const dynamic = 'force-dynamic';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\.html$/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-');
}

function productSlugFromPath(pathname: string) {
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? '';
  const withoutHtml = segment.replace(/\.html$/i, '');
  const withoutLeadId = withoutHtml.replace(/^\d+-/, '');
  const withoutTailNumeric = withoutLeadId.replace(/-\d{10,}$/, '');
  return normalizeSlug(withoutTailNumeric);
}

export async function POST() {
  // DATABASE_URL is guaranteed to be string by the check above
  const sql = postgres(DATABASE_URL as string, { max: 2 });

  try {
    const productsPath = path.resolve(process.cwd(), 'migration/vexmotor/products.json');
    const content = await readFile(productsPath, 'utf8');
    const productsData = JSON.parse(content);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let totalImages = 0;
    let totalSpecs = 0;
    let totalDocs = 0;

    // Get or create brand
    const brandResult = await sql`SELECT id FROM brands WHERE slug = 'stepmotech' LIMIT 1`;
    let brandId: string;

    if (brandResult.length === 0) {
      const inserted = await sql`
        INSERT INTO brands (name, slug, description, status)
        VALUES ('StepMotech', 'stepmotech', 'Imported from legacy site', 'active')
        RETURNING id
      `;
      brandId = inserted[0].id;
    } else {
      brandId = brandResult[0].id;
    }

    for (let i = 0; i < productsData.length; i++) {
      const item = productsData[i];

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

      // Check if product exists
      const existing = await sql`SELECT id FROM products WHERE slug = ${slug} LIMIT 1`;
      let productId: string;

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

      // Import images
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

      // Import specs
      const specs = (item.technicalSpecs || []).filter((s: any) => s.key && s.value).slice(0, 24);

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

      // Import documents
      const downloads = (item.downloads || [])
        .filter((d: any) => d.url && !d.url.includes('#'))
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

      // Progress every 5 products
      if ((imported + updated) % 5 === 0 || i === productsData.length - 1) {
        console.log(`⏳ Progress: ${imported + updated}/${productsData.length} products`);
      }
    }

    await sql.end();

    return NextResponse.json({
      success: true,
      message: 'Import completed successfully',
      stats: {
        imported,
        updated,
        skipped,
        totalImages,
        totalSpecs,
        totalDocs,
      },
    });
  } catch (error: any) {
    await sql.end();
    console.error('Import failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
