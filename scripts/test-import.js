require('dotenv').config({ path: '.env.local' });

const { readFile, writeFile } = require('fs/promises');
const path = require('path');
const postgres = require('postgres').default;

const DATABASE_URL = process.env.DATABASE_URL;
const logFile = path.join(__dirname, 'import-log.txt');

async function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  await writeFile(logFile, line + '\n', { flag: 'a' });
}

async function run() {
  try {
    await log('🚀 Starting import...');
    await log('DATABASE_URL: ' + (DATABASE_URL ? '✅ Set' : '❌ Missing'));
    
    if (!DATABASE_URL) {
      await log('❌ DATABASE_URL not found');
      process.exit(1);
    }

    const sql = postgres(DATABASE_URL, { max: 1 });
    await log('✅ Database connection established');

    // Test connection
    const test = await sql`SELECT 1 as test`;
    await log('✅ Database query test passed: ' + JSON.stringify(test));

    // Load products
    const productsPath = path.resolve(process.cwd(), 'migration/vexmotor/products.json');
    await log('📂 Loading: ' + productsPath);
    
    const content = await readFile(productsPath, 'utf8');
    const productsData = JSON.parse(content);
    await log(`📦 Found ${productsData.length} products`);

    // Show first product as sample
    const first = productsData[0];
    await log('📋 Sample product:');
    await log('   Name: ' + (first.ldProduct?.name || 'N/A'));
    await log('   SKU: ' + (first.ldProduct?.sku || 'N/A'));
    await log('   Images: ' + (first.galleryImages?.length || 0));
    await log('   Specs: ' + (first.technicalSpecs?.length || 0));
    await log('   Downloads: ' + (first.downloads?.length || 0));

    await sql.end();
    await log('✅ Test completed successfully');
    await log('💡 Ready for full import');
    
  } catch (err) {
    await log('❌ Error: ' + err.message);
    await log(err.stack);
    process.exit(1);
  }
}

run();
