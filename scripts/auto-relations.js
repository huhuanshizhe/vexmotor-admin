/**
 * Auto-generate product relations based on smart rules
 * Types: drivers, mechanical-integration, power-control, custom
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
const logFile = path.join(__dirname, 'relations-log.txt');

async function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  await writeFile(logFile, line + '\n', { flag: 'a' });
}

async function run() {
  await writeFile(logFile, '', 'utf8');
  await log('🚀 Starting auto product relations...');

  if (!DATABASE_URL) {
    await log('❌ DATABASE_URL not configured');
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, { max: 2 });

  try {
    // Load all products
    const products = await sql`
      SELECT id, name, slug, sku, description, price
      FROM products
      WHERE status = 'active'
      ORDER BY name
    `;
    await log(`📦 Loaded ${products.length} active products`);

    // Load all specs
    const specs = await sql`
      SELECT product_id, feature_key, feature_value
      FROM product_features
    `;
    await log(`📋 Loaded ${specs.length} specifications`);

    // Build specs map
    const specsMap = {};
    specs.forEach(s => {
      if (!specsMap[s.product_id]) specsMap[s.product_id] = [];
      specsMap[s.product_id].push({ key: s.feature_key, value: s.feature_value });
    });

    // Helper: extract specs for product
    const getSpec = (productId, key) => {
      const productSpecs = specsMap[productId] || [];
      const found = productSpecs.find(s => s.key.toLowerCase().includes(key.toLowerCase()));
      return found ? found.value : null;
    };

    // Helper: extract keywords from name
    const getKeywords = (name) => {
      const lower = name.toLowerCase();
      return {
        isMotor: /motor/.test(lower),
        isStepper: /stepper/.test(lower),
        isServo: /servo/.test(lower),
        isDriver: /driver/.test(lower),
        isController: /controller/.test(lower),
        isCable: /cable|wire/.test(lower),
        isGear: /gear/.test(lower),
        isCoupling: /coupling/.test(lower),
        bodySize: lower.match(/(\d{2})mm/)?.[1] || null,
        voltage: lower.match(/(\d+\.?\d*)\s*v/)?.[1] || null,
        series: lower.match(/^(frame|nema|series\s*)?(\d{2})/)?.[2] || null,
      };
    };

    let totalRelations = 0;
    let skipped = 0;

    // Clear existing auto relations
    await log('\n🗑️  Clearing existing auto-generated relations...');
    await sql`DELETE FROM product_relations WHERE relation_type IN ('drivers', 'mechanical-integration', 'power-control')`;

    // Generate relations for each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const keywords = getKeywords(product.name);
      const relations = [];

      // Rule 1: Same series motors -> similar products
      if (keywords.isMotor && keywords.series) {
        const sameSeries = products.filter(p => {
          if (p.id === product.id) return false;
          const pk = getKeywords(p.name);
          return pk.isMotor && pk.series === keywords.series;
        }).slice(0, 5);

        sameSeries.forEach(p => {
          relations.push({
            relatedProductId: p.id,
            relationType: 'custom',
            relationLabel: 'Same Series',
            sortOrder: relations.length + 1
          });
        });
      }

      // Rule 2: Motors -> Drivers (same voltage if available)
      if (keywords.isMotor) {
        const motorVoltage = getSpec(product.id, 'voltage') || keywords.voltage;
        
        const drivers = products.filter(p => {
          if (p.id === product.id) return false;
          const pk = getKeywords(p.name);
          if (!pk.isDriver && !pk.isController) return false;
          
          // Match voltage if available
          if (motorVoltage) {
            const driverVoltage = getSpec(p.id, 'voltage') || pk.voltage;
            return driverVoltage === motorVoltage;
          }
          return true;
        }).slice(0, 3);

        drivers.forEach(p => {
          relations.push({
            relatedProductId: p.id,
            relationType: 'drivers',
            relationLabel: 'Compatible Driver',
            sortOrder: relations.length + 1
          });
        });
      }

      // Rule 3: Same body size motors -> mechanical integration
      if (keywords.isMotor && keywords.bodySize) {
        const sameSize = products.filter(p => {
          if (p.id === product.id) return false;
          const pk = getKeywords(p.name);
          return pk.isMotor && pk.bodySize === keywords.bodySize && pk.series !== keywords.series;
        }).slice(0, 3);

        sameSize.forEach(p => {
          relations.push({
            relatedProductId: p.id,
            relationType: 'mechanical-integration',
            relationLabel: `Same ${keywords.bodySize}mm Frame`,
            sortOrder: relations.length + 1
          });
        });
      }

      // Rule 4: Drivers -> Motors they can control
      if (keywords.isDriver || keywords.isController) {
        const driverVoltage = getSpec(product.id, 'voltage') || keywords.voltage;
        
        const compatibleMotors = products.filter(p => {
          if (p.id === product.id) return false;
          const pk = getKeywords(p.name);
          if (!pk.isMotor) return false;
          
          if (driverVoltage) {
            const motorVoltage = getSpec(p.id, 'voltage') || pk.voltage;
            return motorVoltage === driverVoltage;
          }
          return pk.isStepper; // Default: stepper drivers work with stepper motors
        }).slice(0, 5);

        compatibleMotors.forEach(p => {
          relations.push({
            relatedProductId: p.id,
            relationType: 'power-control',
            relationLabel: 'Compatible Motor',
            sortOrder: relations.length + 1
          });
        });
      }

      // Insert relations
      if (relations.length > 0) {
        for (const rel of relations) {
          try {
            await sql`
              INSERT INTO product_relations (
                product_id, related_product_id, relation_type, relation_label, sort_order
              ) VALUES (
                ${product.id}, ${rel.relatedProductId}, ${rel.relationType},
                ${rel.relationLabel}, ${rel.sortOrder}
              )
            `;
            totalRelations++;
          } catch (err) {
            // Skip duplicate relations
            if (err.message.includes('duplicate key')) {
              skipped++;
            } else {
              throw err;
            }
          }
        }
      }

      // Progress
      if ((i + 1) % 20 === 0 || i === products.length - 1) {
        await log(`⏳ Progress: ${i + 1}/${products.length} products (${totalRelations} relations)`);
      }
    }

    await log('\n' + '='.repeat(60));
    await log('✅ AUTO RELATIONS COMPLETED SUCCESSFULLY');
    await log('='.repeat(60));
    await log(`🔗 Total relations created: ${totalRelations}`);
    await log(`⏭️  Skipped (duplicates): ${skipped}`);
    await log('='.repeat(60));

  } catch (err) {
    await log(`\n❌ Failed: ${err.message}`);
    await log(err.stack);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
