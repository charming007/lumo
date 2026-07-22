import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./layout.tsx', import.meta.url)), 'utf8');

test('root layout derives a production shell-scope blocker and passes it into the shared app shell', () => {
  assert.match(
    source,
    /const shellScopeDeploymentBlocked = process\.env\.NODE_ENV === 'production' && !pilotControlPlaneEnabled;/,
    'layout should detect the widened production-shell state before shared chrome renders',
  );
  assert.match(
    source,
    /shellScopeDeploymentBlocked=\{shellScopeDeploymentBlocked\}/,
    'layout should pass the production shell blocker into AppShell so blocker pages do not stay wrapped in full-LMS chrome',
  );
});
