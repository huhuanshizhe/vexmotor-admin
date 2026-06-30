#!/usr/bin/env node
/**
 * Monitor translate-all-locales terminal/log output.
 * Usage: node scripts/monitor-translate-run.mjs <logPath> [totalTasks]
 */
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

const logPath = process.argv[2];
const totalTasks = Number(process.argv[3] ?? '402');
const pollMs = Number(process.argv[4] ?? '30000');
const outDir = path.resolve(process.cwd(), 'migration/translate-runs');

if (!logPath) {
  console.error('Usage: node scripts/monitor-translate-run.mjs <logPath> [totalTasks] [pollMs]');
  process.exit(1);
}

const TASK_RE = /^\s+(新建|更新|失败|跳过)\s+(.+?)\s+→\s+(\w+)(?::\s*(.+))?$/;
const DONE_RE = /全部完成|exit_code:/;

function parseLog(text) {
  const lines = text.split(/\r?\n/);
  let processed = 0;
  let failed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const failures = [];
  let done = false;
  let exitCode = null;

  for (const line of lines) {
    if (DONE_RE.test(line)) done = true;
    const exitMatch = line.match(/^exit_code:\s*(\d+)/);
    if (exitMatch) {
      done = true;
      exitCode = Number(exitMatch[1]);
    }

    const m = line.match(TASK_RE);
    if (!m) continue;
    processed += 1;
    const [, action, label, locale, errMsg] = m;
    if (action === '失败') {
      failed += 1;
      failures.push({ label, locale, error: errMsg?.trim() ?? '' });
    } else if (action === '新建') created += 1;
    else if (action === '更新') updated += 1;
    else if (action === '跳过') skipped += 1;
  }

  const pct = totalTasks > 0 ? Math.min(100, (processed / totalTasks) * 100) : 0;
  return { processed, failed, created, updated, skipped, failures, done, exitCode, pct };
}

async function writeFailures(failures, runId) {
  await import('node:fs/promises').then(({ mkdir }) => mkdir(outDir, { recursive: true }));
  const outFile = path.join(outDir, `product-translate-failures-${runId}.txt`);
  const header = [
    `# Product translate failures`,
    `# Generated: ${new Date().toISOString()}`,
    `# Total failures: ${failures.length}`,
    '',
  ].join('\n');
  const body = failures
    .map((f, i) => `${i + 1}. ${f.label} → ${f.locale}\n   ${f.error}`)
    .join('\n\n');
  await writeFile(outFile, `${header}${body}\n`, 'utf8');
  return outFile;
}

function formatReport(state) {
  return [
    `[${new Date().toLocaleTimeString('zh-CN')}] 进度 ${state.pct.toFixed(1)}% (${state.processed}/${totalTasks})`,
    `  新建 ${state.created} | 更新 ${state.updated} | 跳过 ${state.skipped} | 失败 ${state.failed}`,
  ].join('\n');
}

const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
let lastProcessed = -1;

console.log(`监控日志: ${logPath}`);
console.log(`总任务数: ${totalTasks} (201 产品 × 2 语言)`);
console.log(`轮询间隔: ${pollMs}ms\n`);

while (true) {
  let text = '';
  try {
    text = await readFile(logPath, 'utf8');
  } catch {
    console.log('等待日志文件...');
    await new Promise((r) => setTimeout(r, pollMs));
    continue;
  }

  const state = parseLog(text);
  if (state.processed !== lastProcessed) {
    console.log(formatReport(state));
    lastProcessed = state.processed;
    await appendFile(
      path.join(outDir, `progress-${runId}.log`),
      `${formatReport(state)}\n`,
      'utf8',
    ).catch(() => mkdirThenAppend());
  }

  async function mkdirThenAppend() {
    await import('node:fs/promises').then(({ mkdir }) => mkdir(outDir, { recursive: true }));
    await appendFile(path.join(outDir, `progress-${runId}.log`), `${formatReport(state)}\n`, 'utf8');
  }

  if (state.done) {
    const outFile = await writeFailures(state.failures, runId);
    console.log('\n========== 翻译任务已结束 ==========');
    console.log(formatReport(state));
    if (state.exitCode != null) console.log(`退出码: ${state.exitCode}`);
    console.log(`失败记录已写入: ${outFile}`);
    process.exit(state.failed > 0 ? 1 : 0);
  }

  await new Promise((r) => setTimeout(r, pollMs));
}
