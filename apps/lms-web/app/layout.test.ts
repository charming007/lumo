import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./layout.tsx', import.meta.url)), 'utf8');

assert.match(source, /API_BASE_DIAGNOSTIC/, 'layout source should import the API base diagnostic so deployment blockers can short-circuit doomed shell fetches');

test('root layout skips meta fetch when the deployment is already blocked on unsafe API wiring', () => {
  assert.match(
    source,
    /const meta = API_BASE_DIAGNOSTIC\.deploymentBlocked\s*\? FALLBACK_META\s*:\s*await fetchMeta\(\)\.catch\(\(\) => FALLBACK_META\);/,
    'layout should short-circuit to fallback meta when the production API base is already known-bad instead of waiting on a doomed fetch before the blocker can render',
  );
});

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
