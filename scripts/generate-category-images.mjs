import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const API_KEY = 'sk-73c6886b82a64d00adf44d147b2dcf63';
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';

const categories = [
  {
    slug: 'nema-17-stepper-motor',
    name: 'Nema 17 Stepper Motor',
    prompt: 'Professional technical line-art illustration of a Nema 17 stepper motor, isometric 3D view, clean black outlines on white background, engineering schematic style, showing mounting holes, shaft, and connector, no shading, no color, monochrome technical drawing, industrial catalog aesthetic, high detail, centered composition',
  },
  {
    slug: 'nema-23-stepper-motor',
    name: 'Nema 23 Stepper Motor',
    prompt: 'Professional technical line-art illustration of a Nema 23 stepper motor, isometric 3D view, clean black outlines on white background, engineering schematic style, larger frame size, showing mounting holes, shaft, and top connector, no shading, no color, monochrome technical drawing, industrial catalog aesthetic, high detail, centered composition',
  },
  {
    slug: 'stepper-drivers',
    name: 'Stepper Drivers',
    prompt: 'Professional technical line-art illustration of a stepper motor driver module, isometric 3D view, clean black outlines on white background, engineering schematic style, showing circuit board, heat sink, connectors, and control terminals, no shading, no color, monochrome technical drawing, industrial catalog aesthetic, high detail, centered composition',
  },
  {
    slug: 'power-supplies',
    name: 'Power Supplies',
    prompt: 'Professional technical line-art illustration of an industrial power supply unit, isometric 3D view, clean black outlines on white background, engineering schematic style, showing metal enclosure, ventilation holes, terminal block, and power switch, no shading, no color, monochrome technical drawing, industrial catalog aesthetic, high detail, centered composition',
  },
  {
    slug: 'linear-motion',
    name: 'Linear Motion',
    prompt: 'Professional technical line-art illustration of a linear motion actuator with ball screw, isometric 3D view, clean black outlines on white background, engineering schematic style, showing guide rails, carriage, screw mechanism, and motor coupling, no shading, no color, monochrome technical drawing, industrial catalog aesthetic, high detail, centered composition',
  },
  {
    slug: 'gearboxes',
    name: 'Gearboxes',
    prompt: 'Professional technical line-art illustration of a planetary gearbox for stepper motor, isometric 3D view, clean black outlines on white background, engineering schematic style, showing input flange, output shaft, and gear housing, no shading, no color, monochrome technical drawing, industrial catalog aesthetic, high detail, centered composition',
  },
];

async function generateImage(category) {
  console.log(`\n🎨 Generating: ${category.name}...`);

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wanx-v1',
        input: {
          prompt: category.prompt,
        },
        parameters: {
          size: '1024*1024',
          n: 1,
        },
      }),
    });

    const data = await response.json();
    
    if (data.output?.task_id) {
      console.log(`✅ Task created: ${data.output.task_id}`);
      return { ...category, taskId: data.output.task_id };
    } else {
      console.error(`❌ Error for ${category.name}:`, data);
      return null;
    }
  } catch (error) {
    console.error(`❌ Failed to generate ${category.name}:`, error.message);
    return null;
  }
}

async function checkTaskStatus(taskId) {
  const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
  return response.json();
}

async function downloadImage(url, filename) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const outputDir = join(process.cwd(), 'public', 'categories');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, filename), Buffer.from(buffer));
  console.log(`✅ Saved: public/categories/${filename}`);
}

async function main() {
  console.log('🚀 Starting category image generation...\n');
  
  // Submit all tasks
  const tasks = [];
  for (const category of categories) {
    const task = await generateImage(category);
    if (task) tasks.push(task);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
  }
  
  console.log(`\n⏳ Submitted ${tasks.length} tasks. Waiting for completion...\n`);
  
  // Poll for completion
  const completed = [];
  const maxWait = 300000; // 5 minutes
  const startTime = Date.now();
  
  while (completed.length < tasks.length && Date.now() - startTime < maxWait) {
    for (const task of tasks) {
      if (completed.find(c => c.slug === task.slug)) continue;
      
      const status = await checkTaskStatus(task.taskId);
      
      if (status.output?.task_status === 'SUCCEEDED') {
        const imageUrl = status.output.results?.[0]?.url;
        if (imageUrl) {
          await downloadImage(imageUrl, `${task.slug}.png`);
          completed.push(task);
          console.log(`✅ Completed: ${task.name} (${completed.length}/${tasks.length})`);
        }
      } else if (status.output?.task_status === 'FAILED') {
        console.error(`❌ Failed: ${task.name}`, status);
        completed.push(task); // Mark as done to avoid infinite loop
      }
    }
    
    if (completed.length < tasks.length) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }
  }
  
  console.log(`\n🎉 Finished! Generated ${completed.length}/${tasks.length} images.`);
}

main().catch(console.error);
