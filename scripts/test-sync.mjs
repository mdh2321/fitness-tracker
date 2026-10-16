import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const temporary = mkdtempSync(join(tmpdir(), 'arc-sync-test-'));
const bundle = join(process.cwd(), 'node_modules', '.arc-sync-test.cjs');
try {
  await build({ entryPoints: ['tests/health-sync.test.ts'], outfile: bundle, bundle: true,
    platform: 'node', format: 'cjs', packages: 'external' });
  const env = { ...process.env, TURSO_DATABASE_URL: `file:${join(temporary, 'test.db')}`, SYNC_API_KEY: 'local-test-key' };
  delete env.TURSO_AUTH_TOKEN;
  const run = spawnSync(process.execPath, ['--test', bundle], { env, stdio: 'inherit' });
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(bundle, { force: true });
  rmSync(temporary, { recursive: true, force: true });
}
