import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const appDir = path.resolve(import.meta.dirname, '..');

function runValidateBuildEnv(extraEnv: Record<string, string | undefined>) {
  return spawnSync(process.execPath, ['./scripts/validate-build-env.mjs'], {
    cwd: appDir,
    env: {
      ...process.env,
      npm_lifecycle_event: 'build',
      NODE_ENV: 'development',
      VERCEL: '',
      VERCEL_ENV: '',
      CONTEXT: '',
      CI: '',
      NEXT_PUBLIC_API_BASE_URL: 'https://lumo-api-production-303a.up.railway.app',
      LUMO_ADMIN_API_KEY: '',
      ...extraEnv,
    },
    encoding: 'utf8',
  });
}

test('validate-build-env allows local build command when admin API key is missing', () => {
  const result = runValidateBuildEnv({ LUMO_ADMIN_API_KEY: '' });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('validate-build-env blocks hosted or production build command when admin API key is missing', () => {
  const result = runValidateBuildEnv({
    NODE_ENV: 'production',
    LUMO_ADMIN_API_KEY: '',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /LUMO_ADMIN_API_KEY is missing\./);
  assert.match(result.stderr, /deployment build blocker/i);
});

test('validate-build-env allows hosted or production build command when admin API key is present', () => {
  const result = runValidateBuildEnv({
    NODE_ENV: 'production',
    LUMO_ADMIN_API_KEY: 'real-admin-key',
  });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('validate-build-env blocks hosted or production build command when NEXT_PUBLIC_API_BASE_URL includes a nested API path', () => {
  const result = runValidateBuildEnv({
    NODE_ENV: 'production',
    NEXT_PUBLIC_API_BASE_URL: 'https://lumo-api-production-303a.up.railway.app/api/v1',
    LUMO_ADMIN_API_KEY: 'real-admin-key',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NEXT_PUBLIC_API_BASE_URL must be the API origin only/i);
});


test('validate-build-env blocks hosted or production build command when the pilot control plane is explicitly disabled', () => {
  const result = runValidateBuildEnv({
    NODE_ENV: 'production',
    NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: 'false',
    LUMO_ADMIN_API_KEY: 'real-admin-key',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE is explicitly disabled/i);
  assert.match(result.stderr, /widened pilot deployment scope/i);
});
