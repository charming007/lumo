import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./layout.tsx', import.meta.url)), 'utf8');

test('root layout only derives a production shell-scope blocker when pilot mode is still using the default production clamp', () => {
  assert.match(
    source,
    /const pilotControlPlaneFlagMode = getPilotControlPlaneFlagMode\(\);/,
    'layout should read the raw pilot-control-plane flag mode before deciding whether production shell clamping still applies',
  );
  assert.match(
    source,
    /const shellScopeDeploymentBlocked = process\.env\.NODE_ENV === 'production'[\s\S]*pilotControlPlaneFlagMode !== 'disabled'[\s\S]*!pilotControlPlaneEnabled;/,
    'layout should stop force-clamping the full admin shell when production explicitly disables pilot mode',
  );
  assert.match(
    source,
    /shellScopeDeploymentBlocked=\{shellScopeDeploymentBlocked\}/,
    'layout should pass the production shell blocker into AppShell so blocker pages do not stay wrapped in full-LMS chrome',
  );
});
