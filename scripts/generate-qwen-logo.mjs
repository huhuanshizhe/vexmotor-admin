import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const apiKey = process.env.DASHSCOPE_API_KEY;
if (!apiKey) {
  console.error('[logo] Missing DASHSCOPE_API_KEY');
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const model = getArg('--model', process.env.QWEN_IMAGE_MODEL || 'qwen-image');
const promptFile = resolve(getArg('--prompt-file', 'docs/branding/logo-qwen-prompt.txt'));
const outputPath = resolve(getArg('--output', 'public/brand/stepmotech-logo-qwen.png'));
const size = getArg('--size', '1536*1024');

const prompt = (await readFile(promptFile, 'utf8')).trim();

const endpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';

const requestBody = {
  model,
  input: { prompt },
  parameters: {
    size,
    n: 1,
  },
};

console.log(`[logo] model=${model} size=${size}`);

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'X-DashScope-Async': 'disable',
  },
  body: JSON.stringify(requestBody),
});

if (!response.ok) {
  const text = await response.text();
  console.error(`[logo] generation failed: ${response.status}`);
  console.error(text);
  process.exit(1);
}

const payload = await response.json();
const imageUrl = payload?.output?.results?.[0]?.url || payload?.output?.images?.[0]?.url || payload?.output?.choices?.[0]?.url;

if (!imageUrl) {
  console.error('[logo] No image URL in response');
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const imageResponse = await fetch(imageUrl);
if (!imageResponse.ok) {
  console.error(`[logo] Failed to download image: ${imageResponse.status}`);
  process.exit(1);
}

const buffer = Buffer.from(await imageResponse.arrayBuffer());
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, buffer);

console.log(`[logo] saved ${basename(outputPath)}`);
console.log(`[logo] source ${imageUrl}`);
