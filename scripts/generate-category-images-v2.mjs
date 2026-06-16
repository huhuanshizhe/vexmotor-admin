import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const API_KEY = 'sk-73c6886b82a64d00adf44d147b2dcf63';
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';

const categories = [
  {
    slug: 'nema-8-stepper-motor',
    name: 'Nema 8 Stepper Motor',
    prompt: 'Professional technical illustration of a NEMA 8 stepper motor, 20mm square frame, ultra-compact size, showing front face with 4 mounting holes, cylindrical shaft protruding from center, and rear connector wires, isometric 3D view, clean black line art on white background, engineering schematic style, precise dimensions visible, no shading, monochrome technical drawing',
  },
  {
    slug: 'nema-11-stepper-motor',
    name: 'Nema 11 Stepper Motor',
    prompt: 'Professional technical illustration of a NEMA 11 stepper motor, 28mm square frame, compact size, showing front face with 4 mounting holes, 5mm diameter shaft, and rear connector, isometric 3D view, clean black line art on white background, engineering schematic style, precise proportions, no shading, monochrome technical drawing',
  },
  {
    slug: 'nema-14-stepper-motor',
    name: 'Nema 14 Stepper Motor',
    prompt: 'Professional technical illustration of a NEMA 14 stepper motor, 35mm square frame, medium-small size, showing front face with 4 mounting holes, 5mm shaft, and rear JST connector, isometric 3D view, clean black line art on white background, engineering schematic style, accurate proportions, no shading, monochrome technical drawing',
  },
  {
    slug: 'nema-16-stepper-motor',
    name: 'Nema 16 Stepper Motor',
    prompt: 'Professional technical illustration of a NEMA 16 stepper motor, 39mm square frame, medium size, showing front face with 4 mounting holes, 5mm shaft, and rear connector plug, isometric 3D view, clean black line art on white background, engineering schematic style, precise dimensions, no shading, monochrome technical drawing',
  },
  {
    slug: 'nema-17-stepper-motor',
    name: 'Nema 17 Stepper Motor',
    prompt: 'Professional technical illustration of a NEMA 17 stepper motor, 42mm square frame (industry standard), showing front face with 4 mounting holes at 31mm spacing, 5mm diameter shaft (20mm length), and rear 4-pin connector, isometric 3D view, clean black line art on white background, engineering schematic style, accurate NEMA 17 proportions, no shading, monochrome technical drawing',
  },
  {
    slug: 'nema-23-stepper-motor',
    name: 'Nema 23 Stepper Motor',
    prompt: 'Professional technical illustration of a NEMA 23 stepper motor, 57mm square frame, larger high-torque size, showing front face with 4 mounting holes at 47mm spacing, 6.35mm (1/4 inch) shaft, and rear connector, isometric 3D view, clean black line art on white background, engineering schematic style, accurate NEMA 23 proportions, no shading, monochrome technical drawing',
  },
  {
    slug: 'nema-24-stepper-motor',
    name: 'Nema 24 Stepper Motor',
    prompt: 'Professional technical illustration of a NEMA 24 stepper motor, 60mm square frame, enhanced torque version, showing front face with 4 mounting holes, 8mm shaft, and rear connector, isometric 3D view, clean black line art on white background, engineering schematic style, precise NEMA 24 dimensions, no shading, monochrome technical drawing',
  },
  {
    slug: 'nema-34-stepper-motor',
    name: 'Nema 34 Stepper Motor',
    prompt: 'Professional technical illustration of a NEMA 34 stepper motor, 86mm square frame, heavy-duty large size, showing front face with 4 mounting holes at 70mm spacing, 14mm shaft, and rear connector, isometric 3D view, clean black line art on white background, engineering schematic style, accurate NEMA 34 proportions showing large size, no shading, monochrome technical drawing',
  },
  {
    slug: 'stepper-motor-driver',
    name: 'Stepper Motor Driver',
    prompt: 'Professional technical illustration of a stepper motor driver module, showing PCB board with heat sink on top, step/dir signal input terminals on one side, motor output terminals on other side, power input connectors, potentiometer for current adjustment, and status LEDs, isometric 3D view, clean black line art on white background, engineering schematic style, detailed component layout, no shading, monochrome technical drawing',
  },
  {
    slug: 'power-supply',
    name: 'Power Supply',
    prompt: 'Professional technical illustration of an industrial switching power supply unit, metal enclosure with ventilation holes on top and sides, AC input terminal block with earth ground, DC output terminals (V+ V-), voltage adjustment potentiometer, LED power indicator, fan cooling on rear, isometric 3D view, clean black line art on white background, engineering schematic style, accurate industrial PSU design, no shading, monochrome technical drawing',
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
  console.log('🚀 Starting category image generation (Round 2 - Accurate NEMA sizes)...\n');
  
  // Submit all tasks
  const tasks = [];
  for (const category of categories) {
    const task = await generateImage(category);
    if (task) tasks.push(task);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n⏳ Submitted ${tasks.length} tasks. Waiting for completion...\n`);
  
  // Poll for completion
  const completed = [];
  const maxWait = 300000;
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
        completed.push(task);
      }
    }
    
    if (completed.length < tasks.length) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log(`\n🎉 Finished! Generated ${completed.length}/${tasks.length} images.`);
}

main().catch(console.error);
