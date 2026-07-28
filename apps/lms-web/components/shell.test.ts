import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./shell.tsx', import.meta.url)), 'utf8');

test('app shell clamps shared chrome back to the pilot shell when production shell scope is deployment-blocked', () => {
  assert.match(
    source,
    /shellScopeDeploymentBlocked = false/,
    'app shell should accept a route-level production shell blocker signal',
  );
  assert.match(
    source,
    /const effectivePilotControlPlaneEnabled = pilotControlPlaneEnabled \|\| shellScopeDeploymentBlocked;/,
    'app shell should force pilot-safe chrome whenever production shell scope is blocked',
  );
  assert.match(
    source,
    /const pilotRoute = effectivePilotControlPlaneEnabled \? describePilotShellRoute\(pathname\) : undefined;/,
    'app shell should classify route scope from the clamped pilot shell state, not the raw env flag',
  );
  assert.match(
    source,
    /pilotControlPlaneEnabled=\{effectivePilotControlPlaneEnabled\}/,
    'app shell should pass the clamped pilot shell state into shared chrome instead of leaving sidebar and topbar in full-shell mode',
  );
  assert.doesNotMatch(
    source,
    /pilotControlPlaneEnabled=\{pilotControlPlaneEnabled\}/,
    'app shell should stop passing the raw pilot flag straight into shared chrome once a production shell blocker is active',
  );
});
