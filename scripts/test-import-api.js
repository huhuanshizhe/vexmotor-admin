// Test the import API and show detailed errors
const https = require('https');

const url = new URL('https://stepmotech.online/api/admin/import-products');

const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  timeout: 300000,
};

console.log('🚀 Sending POST request to import API...');
console.log('⏳ This may take several minutes for large datasets...\n');

const req = https.request(options, (res) => {
  console.log(`📡 Response status: ${res.statusCode}`);
  console.log(`📡 Response headers:`, res.headers);
  console.log('\n📄 Response body:\n');

  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
    process.stdout.write('.');
  });

  res.on('end', () => {
    console.log('\n\n✅ Request completed');
    console.log('\n📊 Full response:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ Request failed:');
  console.error(e.message);
  console.error(e.stack);
});

req.on('timeout', () => {
  console.error('\n⏰ Request timeout after 5 minutes');
  req.destroy();
});

req.end();
