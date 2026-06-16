// Analyze first product data structure
const data = require('./migration/vexmotor/products.json');
const fs = require('fs');

const product = data[0];

console.log('=== PRODUCT STRUCTURE ANALYSIS ===\n');
console.log('1. URL:', product.url);
console.log('2. Title:', product.title);
console.log('3. Heading:', product.heading);
console.log('4. SEO Title:', product.seoTitle);
console.log('5. SEO Description:', product.seoDescription);

console.log('\n=== ldProduct ===');
if (product.ldProduct) {
  console.log('- Name:', product.ldProduct.name);
  console.log('- SKU:', product.ldProduct.sku);
  console.log('- Price:', product.ldProduct.price);
  console.log('- Currency:', product.ldProduct.currency);
  console.log('- Description:', product.ldProduct.description?.substring(0, 200));
  console.log('- Images count:', product.ldProduct.images?.length || 0);
  console.log('- Images:', product.ldProduct.images?.slice(0, 3));
}

console.log('\n=== Gallery Images ===');
console.log('Count:', product.galleryImages?.length || 0);
console.log('URLs:', product.galleryImages?.slice(0, 5));

console.log('\n=== Technical Specs ===');
console.log('Count:', product.technicalSpecs?.length || 0);
if (product.technicalSpecs?.length > 0) {
  console.log('Sample specs:', JSON.stringify(product.technicalSpecs.slice(0, 10), null, 2));
}

console.log('\n=== Downloads ===');
console.log('Count:', product.downloads?.length || 0);
if (product.downloads?.length > 0) {
  console.log('Sample:', JSON.stringify(product.downloads.slice(0, 3), null, 2));
}

console.log('\n=== Content Blocks (if any) ===');
if (product.contentBlocks) {
  console.log('Blocks:', Object.keys(product.contentBlocks));
}

console.log('\n=== Description (full) ===');
if (product.ldProduct?.description) {
  console.log(product.ldProduct.description);
}

// Save full structure for reference
fs.writeFileSync('scripts/product-structure.json', JSON.stringify(product, null, 2));
console.log('\n✅ Full structure saved to scripts/product-structure.json');
