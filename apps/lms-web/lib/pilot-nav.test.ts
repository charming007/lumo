import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pilotNavSource = readFileSync(fileURLToPath(new URL('./pilot-nav.ts', import.meta.url)), 'utf8');

test('pilot nav defaults to a trimmed deployment-safe shell', () => {
  assert.match(pilotNavSource, /pilotNavMode = FULL_ADMIN_SHELL_ENABLED \? 'full-admin' : 'pilot-trimmed'/);
});

test('pilot nav explicitly blocks deferred pilot routes', () => {
  for (const pathname of ['/canvas', '/english', '/rewards', '/reports', '/guide']) {
    assert.match(pilotNavSource, new RegExp(`'${pathname.replace('/', '\\/')}'|\"${pathname.replace('/', '\\/')}\"`));
  }
});

test('pilot nav keeps a full-admin escape hatch for intentional overrides', () => {
  assert.match(pilotNavSource, /NEXT_PUBLIC_LUMO_FULL_ADMIN_SHELL/);
  assert.match(pilotNavSource, /LUMO_FULL_ADMIN_SHELL/);
});
