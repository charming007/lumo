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
    /const routeScopeDeploymentBlocked = Boolean\([\s\S]*shellScopeDeploymentBlocked[\s\S]*pathname !== '\/'[\s\S]*pilotRoute\.status !== 'visible'[\s\S]*\);/,
    'app shell should derive a direct-route blocker for non-pilot pages while production shell scope is narrowed',
  );
  assert.match(
    source,
    /routeScopeDeploymentBlocked && pilotRoute \? \(/,
    'app shell should replace non-pilot route content with a deployment blocker instead of only hiding the nav link',
  );
  assert.match(
    source,
    /Deployment blocker: \$\{pilotRoute\.routeLabel\} sits outside the pilot control plane\./,
    'app shell blocker copy should call out the direct-route widening risk explicitly',
  );
  assert.match(
    source,
    /direct URL would still widen the deployment target even if the sidebar hides the link/,
    'app shell blocker should explain why chrome-only hiding is not enough for deployment review',
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
