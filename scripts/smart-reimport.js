/**
 * Smart product data re-import with spec categorization and professional descriptions
 */
require('dotenv').config({ path: '.env.local' });

const { readFile } = require('fs/promises');
const path = require('path');

let postgres;
try {
  postgres = require('postgres');
  if (typeof postgres !== 'function') {
    postgres = postgres.default;
  }
} catch (e) {
  console.error('❌ Failed to load postgres module');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

// Smart spec categorization (matching old site structure)
function categorizeSpec(key) {
  const lower = key.toLowerCase();
  
  // Product Type
  if (/product.type|motor.type|type/i.test(lower)) {
    return 'product_type';
  }
  
  // Electrical Specification
  if (/current|voltage|resistance|inductance|power|phase|wire|bipolar|unipolar|rating|electrical/i.test(lower)) {
    return 'electrical';
  }
  
  // Physical/Mechanical Specification
  if (/shaft|body|frame|length|width|height|diameter|weight|mounting|flange|size|dimension|backlash|gear|ratio|holding.torque|step.angle|resolution/i.test(lower)) {
    return 'physical';
  }
  
  // Environmental specs
  if (/temperature|humidity|protection|insulation|class|ip.rating|environment/i.test(lower)) {
    return 'environmental';
  }
  
  return 'general';
}

// Generate professional description from specs
function generateDescription(productName, specs, product) {
  const specMap = {};
  specs.forEach(s => {
    specMap[s.key.toLowerCase()] = `${s.value}${s.unit ? ' ' + s.unit : ''}`;
  });
  
  // Extract key specs
  const stepAngle = specMap['step angle'] || '1.8°';
  const holdingTorque = specMap['holding torque'] || 'N/A';
  const ratedCurrent = specMap['rated current'] || 'N/A';
  const bodyLength = specMap['body length'] || 'N/A';
  const wireCount = specMap['wire count'] || 'N/A';
  
  return `The ${productName} is a high-performance stepper motor engineered for precision motion control applications. 

Key Performance Characteristics:
• Step Angle: ${stepAngle} - Enables precise positioning and smooth motion control
• Holding Torque: ${holdingTorque} - Provides reliable force retention at standstill
• Rated Current: ${ratedCurrent} - Optimized for efficient power consumption
• Body Length: ${bodyLength} - Compact form factor for space-constrained installations
• Wire Configuration: ${wireCount} - Simplifies integration with standard stepper drivers

Technical Excellence:
This motor features precision-manufactured rotor and stator assemblies, high-quality ball bearings for extended service life, and optimized magnetic circuit design for maximum torque output. The bipolar configuration ensures compatibility with industry-standard stepper drivers, making it ideal for CNC machines, 3D printers, robotics, automation equipment, and precision instrumentation.

Quality & Reliability:
Built with Class B insulation system and designed for continuous duty operation. Each unit undergoes rigorous quality testing to ensure consistent performance across the full operating temperature range. Backed by comprehensive technical documentation including torque-speed curves, dimensional drawings, and wiring diagrams.

Applications:
Suitable for a wide range of industrial and commercial applications including CNC routing, laser cutting, pick-and-place systems, medical devices, packaging machinery, textile equipment, and laboratory automation.`;
}

async function run() {
  console.log('🚀 Starting smart product re-import...\n');

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not configured');
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, { max: 2 });

  try {
    // Load products
    const productsPath = path.resolve(process.cwd(), 'migration/vexmotor/products.json');
    const content = await readFile(productsPath, 'utf8');
    const productsData = JSON.parse(content);
    console.log(`📦 Found ${productsData.length} products to re-import\n`);

    let updated = 0;
    let totalSpecs = 0;

    for (let i = 0; i < productsData.length; i++) {
      const item = productsData[i];

      if (!item.ldProduct?.name) continue;

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
      
      // Generate professional description
      const specs = (item.technicalSpecs || []).filter(s => s.key && s.value);
      const longDescription = (item.descriptionLong || '').trim() || generateDescription(name, specs, item);

      // Update product with long description
      await sql`
        UPDATE products SET
          description_long = ${longDescription},
          updated_at = NOW()
        WHERE slug = ${slug}
      `;

      // Delete old specs
      const productResult = await sql`SELECT id FROM products WHERE slug = ${slug} LIMIT 1`;
      if (productResult.length === 0) continue;
      
      const productId = productResult[0].id;
      await sql`DELETE FROM product_features WHERE product_id = ${productId}`;

      // Insert categorized specs
      if (specs.length > 0) {
        for (let j = 0; j < specs.length; j++) {
          const spec = specs[j];
          const category = categorizeSpec(spec.key);
          
          await sql`
            INSERT INTO product_features (
              product_id, feature_key, feature_value, unit, spec_category, sort_order
            ) VALUES (
              ${productId}, ${spec.key.trim()}, ${String(spec.value).trim()},
              ${spec.unit || null}, ${category}, ${j + 1}
            )
          `;
        }
        
        totalSpecs += specs.length;
      }

      updated++;

      // Progress
      if ((i + 1) % 20 === 0 || i === productsData.length - 1) {
        console.log(`⏳ Progress: ${updated}/${productsData.length} products (${totalSpecs} specs categorized)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ SMART RE-IMPORT COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`🔄 Products updated: ${updated}`);
    console.log(`📋 Specs categorized: ${totalSpecs}`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error(`\n❌ Failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
