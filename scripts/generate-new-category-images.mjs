/**
 * 为新增的 5 个类目生成图片（DashScope API）
 * 使用 wanx-v1 模型生成专业产品图片
 */

const API_KEY = 'sk-73c6886b82a64d00adf44d147b2dcf63';
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
const TASK_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks';
import fs from 'fs';
import path from 'path';

const categories = [
  {
    slug: 'closed-loop-stepper-motor',
    prompt: 'Professional product photo of a closed-loop stepper motor with integrated optical encoder on rear, square NEMA 17 frame 42mm with 4 mounting holes on front flange, 5mm shaft protruding from front, cylindrical encoder module at back with shielded cable, LED status indicator, high-precision industrial motion control design, realistic 3D rendering, clean white background, soft studio lighting, subtle shadow, 45-degree isometric angle, high detail product photography'
  },
  {
    slug: 'brushless-dc-motor',
    prompt: 'Professional product photo of a brushless DC motor BLDC, round cylindrical brushed aluminum body, front bearing plate with output shaft, 3-phase power connector at rear, separate Hall sensor 5-pin connector, rear end cap with ventilation slots, nameplate on body, compact industrial servo motor design, realistic 3D rendering, clean white background, soft studio lighting, subtle shadow, 45-degree isometric angle, high detail product photography'
  },
  {
    slug: 'brushless-spindle-motor',
    prompt: 'Professional product photo of a CNC brushless spindle motor, heavy-duty cylindrical metal body, precision ER collet chuck at front for tool holding, water cooling jacket as outer sleeve with inlet outlet ports, high-speed rated industrial motor, machined aluminum finish, realistic 3D rendering, clean white background, soft studio lighting, subtle shadow, 45-degree isometric angle, high detail product photography'
  },
  {
    slug: 'integrated-stepper-motor',
    prompt: 'Professional product photo of an integrated stepper motor with built-in driver, square NEMA 17 frame 42mm with 4 mounting holes, 5mm shaft from front, compact driver electronics module directly on rear of motor, single multi-pin cable connector, all-in-one design replacing separate motor and driver, clean industrial appearance, realistic 3D rendering, clean white background, soft studio lighting, subtle shadow, 45-degree isometric angle, high detail product photography'
  },
  {
    slug: 'stepper-motor',
    prompt: 'Professional product photo showing a lineup of 6 NEMA stepper motors arranged by size from left to right: NEMA 8 tiny 20mm, NEMA 11 small 28mm, NEMA 14 medium 35mm, NEMA 17 standard 42mm, NEMA 23 large 57mm, NEMA 34 huge 86mm, all with square metal frames and front mounting holes and protruding shafts, industrial product family lineup display, realistic 3D rendering, clean white background, soft studio lighting, centered composition, high detail product photography'
  },
];

async function submitTask(prompt) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'wanx-v1',
      input: { prompt },
      parameters: { size: '1024*1024', n: 1 },
    }),
  });

  const data = await response.json();
  if (data.output?.task_id) {
    console.log(`  Task ID: ${data.output.task_id}`);
    return data.output.task_id;
  }
  console.error('  Submit failed:', JSON.stringify(data));
  return null;
}

async function pollTask(taskId) {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const response = await fetch(`${TASK_URL}/${taskId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    const data = await response.json();
    const status = data.output?.task_status;
    if (status === 'SUCCEEDED') {
      return data.output?.results?.[0]?.url || null;
    }
    if (status === 'FAILED') {
      console.error('  Task failed:', JSON.stringify(data.output));
      return null;
    }
    console.log(`  Status: ${status} (${i + 1}/${maxAttempts})`);
  }
  return null;
}

async function downloadImage(url, filepath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  console.log(`  Saved: ${filepath} (${buffer.length} bytes)`);
}

async function main() {
  const downloadDir = path.resolve('d:/vexmotor/public/categories');
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  console.log(`\n=== Generating ${categories.length} category images ===\n`);

  // Submit all tasks first
  const tasks = [];
  for (const cat of categories) {
    console.log(`[${cat.slug}] Submitting...`);
    const taskId = await submitTask(cat.prompt);
    if (taskId) {
      tasks.push({ ...cat, taskId });
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== Waiting for ${tasks.length} tasks to complete ===\n`);

  // Poll and download
  for (const task of tasks) {
    console.log(`[${task.slug}] Polling...`);
    const imageUrl = await pollTask(task.taskId);
    if (imageUrl) {
      const filepath = path.join(downloadDir, `${task.slug}.png`);
      await downloadImage(imageUrl, filepath);
    } else {
      console.log(`[${task.slug}] FAILED`);
    }
  }

  console.log('\n=== Done! ===');
}

main().catch(console.error);
