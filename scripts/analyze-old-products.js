// Deep analyze old site product data structure
const data = require('./migration/vexmotor/products.json');
const fs = require('fs');

console.log('📊 ANALYZING OLD SITE PRODUCT DATA\n');
console.log(`Total products: ${data.length}\n`);

// Analyze first 3 products in detail
const samples = data.slice(0, 3);

samples.forEach((product, idx) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PRODUCT ${idx + 1}: ${product.ldProduct?.name || 'NO NAME'}`);
  console.log('='.repeat(60));
  
  // 1. Description analysis
  console.log('\n📝 DESCRIPTION:');
  console.log('- Short (heading):', product.heading?.substring(0, 100));
  console.log('- Long (description):', product.ldProduct?.description?.substring(0, 200));
  console.log('- Description length:', product.ldProduct?.description?.length || 0);
  
  // 2. Images analysis
  console.log('\n🖼️  IMAGES:');
  console.log('- ldProduct.images:', product.ldProduct?.images?.length || 0);
  console.log('- galleryImages:', product.galleryImages?.length || 0);
  console.log('- Sample URLs:', product.ldProduct?.images?.slice(0, 2));
  console.log('- Sample gallery:', product.galleryImages?.slice(0, 2));
  
  // 3. Technical Specs analysis
  console.log('\n📋 TECHNICAL SPECS:');
  console.log('- Total specs:', product.technicalSpecs?.length || 0);
  
  if (product.technicalSpecs?.length > 0) {
    // Group by common categories
    const specs = product.technicalSpecs;
    const electrical = specs.filter(s => /voltage|current|resistance|inductance|power|phase|wire/i.test(s.key));
    const mechanical = specs.filter(s => /shaft|body|frame|length|diameter|weight|mounting/i.test(s.key));
    const performance = specs.filter(s => /torque|speed|step|resolution|frequency/i.test(s.key));
    const environmental = specs.filter(s => /temperature|humidity|protection|insulation/i.test(s.key));
    
    console.log('  - Electrical:', electrical.length);
    electrical.slice(0, 3).forEach(s => console.log(`    • ${s.key}: ${s.value} ${s.unit || ''}`));
    
    console.log('  - Mechanical:', mechanical.length);
    mechanical.slice(0, 3).forEach(s => console.log(`    • ${s.key}: ${s.value} ${s.unit || ''}`));
    
    console.log('  - Performance:', performance.length);
    performance.slice(0, 3).forEach(s => console.log(`    • ${s.key}: ${s.value} ${s.unit || ''}`));
    
    console.log('  - Environmental:', environmental.length);
    environmental.slice(0, 3).forEach(s => console.log(`    • ${s.key}: ${s.value} ${s.unit || ''}`));
    
    console.log('  - Uncategorized:', specs.length - electrical.length - mechanical.length - performance.length - environmental.length);
  }
  
  // 4. Downloads analysis
  console.log('\n📄 DOWNLOADS:');
  console.log('- Total:', product.downloads?.length || 0);
  product.downloads?.slice(0, 3).forEach(d => {
    console.log(`  • ${d.label}: ${d.url}`);
  });
  
  // 5. Check for torque curves or special images
  const allImages = [...(product.ldProduct?.images || []), ...(product.galleryImages || [])];
  const torqueCurves = allImages.filter(img => /torque|curve|performance|graph/i.test(img));
  const dimensions = allImages.filter(img => /dimension|diagram|size|drawing|outline/i.test(img));
  
  console.log('\n📐 SPECIAL IMAGES:');
  console.log('- Torque curves:', torqueCurves.length);
  console.log('- Dimension drawings:', dimensions.length);
});

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('📈 SUMMARY STATISTICS');
console.log('='.repeat(60));

const totalSpecs = data.reduce((sum, p) => sum + (p.technicalSpecs?.length || 0), 0);
const totalImages = data.reduce((sum, p) => sum + (p.ldProduct?.images?.length || 0) + (p.galleryImages?.length || 0), 0);
const totalDocs = data.reduce((sum, p) => sum + (p.downloads?.length || 0), 0);
const hasLongDesc = data.filter(p => p.ldProduct?.description?.length > 200).length;

console.log(`- Average specs per product: ${(totalSpecs / data.length).toFixed(1)}`);
console.log(`- Average images per product: ${(totalImages / data.length).toFixed(1)}`);
console.log(`- Average docs per product: ${(totalDocs / data.length).toFixed(1)}`);
console.log(`- Products with long description: ${hasLongDesc}/${data.length}`);

// Save analysis
const analysis = {
  totalProducts: data.length,
  sampleProducts: samples.map(p => ({
    name: p.ldProduct?.name,
    specsCount: p.technicalSpecs?.length || 0,
    imagesCount: (p.ldProduct?.images?.length || 0) + (p.galleryImages?.length || 0),
    docsCount: p.downloads?.length || 0,
    descLength: p.ldProduct?.description?.length || 0,
    specs: p.technicalSpecs?.slice(0, 20)
  }))
};

fs.writeFileSync('scripts/analysis-result.json', JSON.stringify(analysis, null, 2));
console.log('\n✅ Detailed analysis saved to scripts/analysis-result.json');
