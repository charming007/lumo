import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const appDir = path.resolve(import.meta.dirname, '..');

function readRuntimeConfig(extraEnv: Record<string, string | undefined>) {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import('./lib/config.ts').then(({ API_BASE_DIAGNOSTIC, API_BASE_SOURCE }) => { console.log(JSON.stringify({ API_BASE_DIAGNOSTIC, API_BASE_SOURCE })); });",
    ],
    {
      cwd: appDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_BASE_URL: 'https://lumo-api-production-303a.up.railway.app',
        ...extraEnv,
      },
      encoding: 'utf8',
    },
  );
}

test('config marks API base with nested /api/v1 path as a production deployment blocker', () => {
  const result = readRuntimeConfig({
    NEXT_PUBLIC_API_BASE_URL: 'https://lumo-api-production-303a.up.railway.app/api/v1',
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout.trim()) as {
    API_BASE_SOURCE: string;
    API_BASE_DIAGNOSTIC: {
      deploymentBlocked: boolean;
      blockerDetail?: string;
    };
  };

  assert.equal(payload.API_BASE_SOURCE, 'invalid-production-env');
  assert.equal(payload.API_BASE_DIAGNOSTIC.deploymentBlocked, true);
  assert.match(payload.API_BASE_DIAGNOSTIC.blockerDetail ?? '', /must be the API origin only/i);
  assert.match(payload.API_BASE_DIAGNOSTIC.blockerDetail ?? '', /already appends \/api\/v1 routes itself/i);
});
