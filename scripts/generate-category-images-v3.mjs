/**
 * 生成 18 张专业产品图片
 * 参考 omc-stepperonline.com 风格：
 * - 白色背景
 * - 3D 渲染 / 真实产品照片风格
 * - 统一的角度（45° 俯视）
 * - 清晰的阴影和高光
 * - 产品尺寸比例一致
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = 'sk-73c6886b82a64d00adf44d147b2dcf63';
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'categories');

const categories = [
  // Nema 8 系列
  {
    slug: 'nema-8-stepper-motor',
    name: 'Nema 8 Stepper Motor',
    prompt: 'Professional product photo of a NEMA 8 stepper motor, 20mm square frame, ultra-compact size, 4-wire bipolar configuration, front view with 4 mounting holes visible, cylindrical shaft protruding from front, realistic 3D rendering style, clean white background, soft studio lighting, subtle shadows, high detail industrial product photography, centered composition, 45-degree isometric angle',
  },
  {
    slug: 'nema-8-bipolar',
    name: 'Nema 8 Bipolar',
    prompt: 'Professional product photo of a NEMA 8 bipolar stepper motor, 20mm frame, 4-wire configuration with colored wires (red, blue, green, black), compact cylindrical body with square front flange, 3mm shaft diameter, realistic 3D rendering, white background, studio lighting, high detail',
  },
  
  // Nema 11 系列
  {
    slug: 'nema-11-stepper-motor',
    name: 'Nema 11 Stepper Motor',
    prompt: 'Professional product photo of a NEMA 11 stepper motor, 28mm square frame, compact design, 4 mounting holes on front flange, 5mm shaft with flat cut, rear connector with 4-6 pins, realistic 3D rendering style, clean white background, soft shadows, industrial product photography, 45-degree angle',
  },
  {
    slug: 'nema-11-unipolar',
    name: 'Nema 11 Unipolar',
    prompt: 'Professional product photo of a NEMA 11 unipolar stepper motor, 28mm frame, 6-wire configuration with color-coded wires, center tap visible, square front plate with mounting holes, cylindrical body, realistic 3D rendering, white background, studio lighting',
  },
  
  // Nema 14 系列
  {
    slug: 'nema-14-stepper-motor',
    name: 'Nema 14 Stepper Motor',
    prompt: 'Professional product photo of a NEMA 14 stepper motor, 35mm square frame, mid-size design, 4 mounting holes at corners, 5mm diameter shaft extending 20mm, rear 4-pin connector, realistic 3D rendering style, clean white background, soft shadows, high detail, 45-degree isometric view',
  },
  {
    slug: 'nema-14-bipolar',
    name: 'Nema 14 Bipolar',
    prompt: 'Professional product photo of a NEMA 14 bipolar stepper motor, 35mm frame, 4-wire bipolar configuration, square front flange with 4 mounting holes, smooth cylindrical body, 5mm shaft with keyway, realistic 3D rendering, white background, studio lighting',
  },
  
  // Nema 16 系列
  {
    slug: 'nema-16-stepper-motor',
    name: 'Nema 16 Stepper Motor',
    prompt: 'Professional product photo of a NEMA 16 stepper motor, 39mm square frame, industrial design, 4 mounting holes on front plate, 5mm shaft with flat spot, rear terminal block with 4 pins, realistic 3D rendering style, clean white background, soft shadows, high detail',
  },
  
  // Nema 17 系列（最重要，最常用）
  {
    slug: 'nema-17-stepper-motor',
    name: 'Nema 17 Stepper Motor',
    prompt: 'Professional product photo of a NEMA 17 stepper motor, 42mm square frame (industry standard), front view showing 4 mounting holes at 31mm spacing, 5mm diameter shaft extending 20mm, rear 4-pin JST connector, realistic 3D rendering style, clean white background, soft studio lighting, subtle shadows, high detail industrial product photography, 45-degree isometric angle showing depth',
  },
  {
    slug: 'nema-17-bipolar',
    name: 'Nema 17 Bipolar',
    prompt: 'Professional product photo of a NEMA 17 bipolar stepper motor, 42mm frame, 4-wire configuration with colored wires (red, blue, green, black), square front flange, 5mm shaft, cylindrical body with visible laminations, realistic 3D rendering, white background, studio lighting, high detail',
  },
  {
    slug: 'nema-17-unipolar',
    name: 'Nema 17 Unipolar',
    prompt: 'Professional product photo of a NEMA 17 unipolar stepper motor, 42mm frame, 5 or 6-wire configuration with color-coded wires, center tap visible, square mounting plate, 5mm shaft with flat cut, realistic 3D rendering, white background, studio lighting',
  },
  {
    slug: 'nema-17-high-torque',
    name: 'Nema 17 High Torque',
    prompt: 'Professional product photo of a NEMA 17 high-torque stepper motor, 42mm frame with extended body length (60mm), heavy-duty construction, larger shaft (5mm), reinforced mounting holes, heat sink fins on body, realistic 3D rendering, white background, studio lighting',
  },
  
  // Nema 23 系列
  {
    slug: 'nema-23-stepper-motor',
    name: 'Nema 23 Stepper Motor',
    prompt: 'Professional product photo of a NEMA 23 stepper motor, 57mm square frame, high-torque industrial design, 4 mounting holes at corners, 6.35mm (1/4 inch) shaft extending 25mm, rear terminal block, realistic 3D rendering style, clean white background, soft shadows, high detail, 45-degree isometric view',
  },
  {
    slug: 'nema-23-bipolar',
    name: 'Nema 23 Bipolar',
    prompt: 'Professional product photo of a NEMA 23 bipolar stepper motor, 57mm frame, 4-wire heavy-gauge wires, robust square body, 6.35mm shaft with keyway, visible cooling fins, realistic 3D rendering, white background, studio lighting',
  },
  
  // Nema 24 系列
  {
    slug: 'nema-24-stepper-motor',
    name: 'Nema 24 Stepper Motor',
    prompt: 'Professional product photo of a NEMA 24 stepper motor, 60mm square frame, enhanced torque design, thicker body than Nema 23, 8mm shaft with flat spot, reinforced front flange, realistic 3D rendering style, clean white background, soft shadows, high detail',
  },
  
  // Nema 34 系列
  {
    slug: 'nema-34-stepper-motor',
    name: 'Nema 34 Stepper Motor',
    prompt: 'Professional product photo of a NEMA 34 stepper motor, 86mm square frame, heavy-duty industrial motor, very large size, 4 mounting holes, 14mm shaft with keyway, cooling fins on body, rear connector, realistic 3D rendering style, clean white background, soft shadows, high detail',
  },
  
  // 驱动器
  {
    slug: 'stepper-motor-driver',
    name: 'Stepper Motor Driver',
    prompt: 'Professional product photo of a stepper motor driver module, aluminum heat sink on top with fins, blue or green PCB underneath, terminal blocks for motor connections (A+, A-, B+, B-), power input terminals, DIP switches for current setting, realistic 3D rendering style, clean white background, soft shadows, high detail electronics photography',
  },
  {
    slug: 'digital-stepper-driver',
    name: 'Digital Stepper Driver',
    prompt: 'Professional product photo of a digital stepper motor driver, red or black aluminum enclosure with heat sink, LED display showing current setting, terminal blocks, DB9 connector for control signals, compact industrial design, realistic 3D rendering, white background, studio lighting',
  },
  
  // 电源
  {
    slug: 'power-supply',
    name: 'Power Supply',
    prompt: 'Professional product photo of an industrial switching power supply, silver metal enclosure with ventilation holes on sides, green terminal block on front (L, N, GND, +V, -V), LED indicator light, fan on rear, realistic 3D rendering style, clean white background, soft shadows, high detail',
  },
];

async function generateImage(category) {
  console.log(`\n🎨 Generating: ${category.name}...`);
  
  try {
    // 1. 提交任务
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wanx-v1',
        input: { prompt: category.prompt },
        parameters: { size: '1024*1024', n: 1 },
      }),
    });

    const data = await response.json();
    
    if (data.output?.task_id) {
      console.log(`  ✅ Task submitted: ${data.output.task_id}`);
      return { taskId: data.output.task_id, category };
    } else {
      console.error(`  ❌ Failed to submit: ${JSON.stringify(data)}`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function checkTaskStatus(taskId) {
  const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  return response.json();
}

async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const filepath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(filepath, Buffer.from(buffer));
    console.log(`  💾 Saved: ${filename}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Download failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting image generation for 18 categories...');
  console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

  // 确保输出目录存在
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // 提交所有任务
  const tasks = [];
  for (const category of categories) {
    const result = await generateImage(category);
    if (result) {
      tasks.push(result);
    }
    // 避免 API 限流
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 ${tasks.length}/${categories.length} tasks submitted successfully\n`);

  // 轮询任务状态
  const completed = new Set();
  const failed = new Set();
  
  while (completed.size + failed.size < tasks.length) {
    console.log(`\n⏳ Checking status... ${completed.size}/${tasks.length} completed`);
    
    for (const task of tasks) {
      if (completed.has(task.taskId) || failed.has(task.taskId)) {
        continue;
      }

      try {
        const status = await checkTaskStatus(task.taskId);
        const taskStatus = status.output?.task_status;

        if (taskStatus === 'SUCCEEDED') {
          const imageUrl = status.output?.results?.[0]?.url;
          if (imageUrl) {
            const filename = `${task.category.slug}.png`;
            const downloaded = await downloadImage(imageUrl, filename);
            if (downloaded) {
              completed.add(task.taskId);
              console.log(`  ✅ Completed: ${task.category.name}`);
            } else {
              failed.add(task.taskId);
            }
          } else {
            failed.add(task.taskId);
            console.error(`  ❌ No image URL for: ${task.category.name}`);
          }
        } else if (taskStatus === 'FAILED') {
          failed.add(task.taskId);
          console.error(`  ❌ Failed: ${task.category.name} - ${JSON.stringify(status.output)}`);
        }
      } catch (error) {
        console.error(`  ❌ Error checking ${task.taskId}: ${error.message}`);
      }
    }

    // 等待 10 秒再检查
    if (completed.size + failed.size < tasks.length) {
      console.log('  ⏰ Waiting 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log(`\n🎉 Generation complete!`);
  console.log(`  ✅ Success: ${completed.size}`);
  console.log(`  ❌ Failed: ${failed.size}`);
  console.log(`  📁 Location: ${OUTPUT_DIR}`);
}

main().catch(console.error);
