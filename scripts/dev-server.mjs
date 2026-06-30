import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rawArgs = process.argv.slice(2);
const useTurbo = rawArgs.includes('--turbo');
const useDatabase = rawArgs.includes('--db');
const forwardedArgs = rawArgs.filter((arg) => arg !== '--turbo' && arg !== '--db');

const nextCliPath = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const env = {
  ...process.env,
  ...(useDatabase ? { DB_ENABLE_IN_DEV: 'true' } : {}),
};

const port = process.env.PORT ?? '5100';

console.log(
  `[dev-server] bundler=${useTurbo ? 'turbopack' : 'webpack'} database=${useDatabase ? 'enabled' : 'fallback-only'} port=${port}`,
);

// Next.js 16 defaults to Turbopack; --webpack matches vexmotor-web and avoids
// Windows/pnpm "Next.js package not found" panics on admin pages (e.g. coupons).
const bundlerArgs = useTurbo ? ['--turbo'] : ['--webpack'];

const child = spawn(
  process.execPath,
  [nextCliPath, 'dev', '-p', port, ...bundlerArgs, ...forwardedArgs],
  {
    stdio: 'inherit',
    env,
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
