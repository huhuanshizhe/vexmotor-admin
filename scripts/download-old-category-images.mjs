import fs from 'fs';
import path from 'path';

// Old site category image mapping (ID from URL → slug)
const categoryImages = {
  // ID → slug mapping based on old site URLs
  '35': 'nema-17-stepper-motor',
  '36': 'nema-8-stepper-motor',
  '37': 'nema-11-stepper-motor',
  '38': 'nema-14-stepper-motor',
  '39': 'nema-16-stepper-motor',
  '40': 'nema-23-stepper-motor',
  '41': 'nema-24-stepper-motor',
  '42': 'nema-34-stepper-motor',
  '43': 'stepper-motor-driver',
  '44': 'power-supply',
  // New categories - try fetching from their category pages
  '47': 'closed-loop-stepper-motor',
  '48': 'brushless-dc-motor',
  '49': 'integrated-stepper-motor',
  '50': 'brushless-spindle-motor',
  '28': 'stepper-motor',
};

const downloadDir = 'd:/vexmotor/public/categories';

async function downloadImage(url, filepath) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!response.ok) {
      console.log(`  FAILED: ${response.status}`);
      return false;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    console.log(`  Saved: ${path.basename(filepath)} (${buffer.length} bytes)`);
    return true;
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  console.log('=== Downloading old site category images ===\n');

  let successCount = 0;
  let failCount = 0;

  for (const [id, slug] of Object.entries(categoryImages)) {
    const url = `https://www.vexmotor.com/modules/cz_categoryimagelist/views/img/${id}-cz_categoryimagelist.png`;
    const filepath = path.join(downloadDir, `${slug}.png`);
    console.log(`[${slug}] Downloading from ${url}`);
    const ok = await downloadImage(url, filepath);
    if (ok) successCount++;
    else failCount++;
  }

  console.log(`\n=== Results ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

main().catch(console.error);
