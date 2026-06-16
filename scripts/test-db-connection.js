// Test database connection with different URL formats
require('dotenv').config({ path: '.env.local' });

let postgres;
try {
  postgres = require('postgres');
  if (typeof postgres !== 'function') {
    postgres = postgres.default;
  }
} catch (e) {
  console.error('❌ Failed to load postgres module:', e.message);
  process.exit(1);
}

async function test() {
  console.log('🔍 Testing database connection...\n');
  
  const originalUrl = process.env.DATABASE_URL;
  console.log('Original URL:', originalUrl, '\n');
  
  // Try without channel_binding first
  const simpleUrl = originalUrl.replace('&channel_binding=require', '');
  console.log('Trying without channel_binding...');
  console.log('URL:', simpleUrl, '\n');
  
  try {
    const sql = postgres(simpleUrl, {
      max: 1,
      idle_timeout: 10,
      connect_timeout: 10,
    });
    
    console.log('⏳ Connecting...');
    const result = await sql`SELECT 1 as test, current_database() as dbname, current_user as user`;
    console.log('✅ SUCCESS! Connected to database!\n');
    console.log('Result:', result[0]);
    
    await sql.end();
    console.log('\n💡 Connection successful!');
    console.log('💡 Use this URL format (without channel_binding):');
    console.log(simpleUrl);
    
  } catch (err) {
    console.error('❌ Failed:', err.message);
    console.error('\nTrying alternative approaches...\n');
    
    // Try with ssl: require
    try {
      const baseUrl = 'postgresql://neondb_owner:npg_ZaA1Ruz9TUFv@ep-curly-field-a6wk13j5-pooler.us-west-2.aws.neon.tech/neondb';
      console.log('Trying with explicit SSL option...');
      
      const sql = postgres(baseUrl, {
        max: 1,
        ssl: { rejectUnauthorized: false },
        idle_timeout: 10,
        connect_timeout: 10,
      });
      
      const result = await sql`SELECT 1 as test`;
      console.log('✅ SUCCESS with SSL option!\n');
      console.log('Result:', result[0]);
      
      await sql.end();
    } catch (err2) {
      console.error('❌ Also failed:', err2.message);
      console.error('\n⚠️  Please check:');
      console.error('1. Is the password correct?');
      console.error('2. Is the database accessible from your network?');
      console.error('3. Try checking your Neon console for the correct connection string');
    }
  }
}

test();
