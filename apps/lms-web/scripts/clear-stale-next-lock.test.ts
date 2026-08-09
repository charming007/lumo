import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const scriptPath = path.resolve(import.meta.dirname, './clear-stale-next-lock.mjs');

function runScript(projectDir: string, extraEnv: Record<string, string> = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: projectDir,
    env: {
      ...process.env,
      npm_lifecycle_event: 'build',
      ...extraEnv,
    },
    encoding: 'utf8',
  });
}

test('clear-stale-next-lock removes an old .next lock before build', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-next-lock-'));
  const nextDir = path.join(projectDir, '.next');
  const lockFile = path.join(nextDir, 'lock');

  fs.mkdirSync(nextDir, { recursive: true });
  fs.writeFileSync(lockFile, '');

  const staleTime = new Date(Date.now() - 30_000);
  fs.utimesSync(lockFile, staleTime, staleTime);

  const result = runScript(projectDir);

  assert.equal(result.status, 0);
  assert.equal(fs.existsSync(lockFile), false);
  assert.match(result.stderr, /Removed stale Next\.js build lock/);
});

test('clear-stale-next-lock leaves a freshly touched lock alone', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-next-lock-'));
  const nextDir = path.join(projectDir, '.next');
  const lockFile = path.join(nextDir, 'lock');

  fs.mkdirSync(nextDir, { recursive: true });
  fs.writeFileSync(lockFile, '');

  const result = runScript(projectDir);

  assert.equal(result.status, 0);
  assert.equal(fs.existsSync(lockFile), true);
  assert.match(result.stderr, /Skipping stale Next\.js lock cleanup/);
});
