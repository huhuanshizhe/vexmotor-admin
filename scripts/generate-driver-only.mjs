import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const API_KEY = 'sk-73c6886b82a64d00adf44d147b2dcf63';
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';

async function main() {
  console.log('🎨 Regenerating Stepper Motor Driver...\n');

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
        prompt: 'Professional technical illustration of a stepper motor driver controller board, showing aluminum heat sink on top, PCB with electronic components, terminal blocks for motor wiring and power input, potentiometer for current adjustment, isometric 3D view, clean black line art on white background, engineering schematic style, no shading, monochrome',
      },
      parameters: {
        size: '1024*1024',
        n: 1,
      },
    }),
  });

  const data = await response.json();
  const taskId = data.output?.task_id;
  
  if (!taskId) {
    console.error('❌ Failed to create task:', data);
    return;
  }
  
  console.log(`✅ Task created: ${taskId}\n⏳ Waiting for completion...`);
  
  // Poll
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    
    const statusRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    const status = await statusRes.json();
    
    if (status.output?.task_status === 'SUCCEEDED') {
      const url = status.output.results?.[0]?.url;
      if (url) {
        const imgRes = await fetch(url);
        const buffer = await imgRes.arrayBuffer();
        const outputDir = join(process.cwd(), 'public', 'categories');
        mkdirSync(outputDir, { recursive: true });
        writeFileSync(join(outputDir, 'stepper-motor-driver.png'), Buffer.from(buffer));
        console.log('✅ Saved: public/categories/stepper-motor-driver.png');
        return;
      }
    } else if (status.output?.task_status === 'FAILED') {
      console.error('❌ Task failed:', status);
      return;
    }
    
    console.log(`⏳ Still waiting... (${i + 1}/60)`);
  }
  
  console.error('❌ Timeout');
}

main().catch(console.error);
