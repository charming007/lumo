import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const podsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('pods page hard-blocks when production API wiring is unsafe', () => {
  assert.match(podsPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'pods page should block when the LMS API base is unsafe for production');
  assert.match(podsPageSource, /Deployment blocker: pods API base URL is unsafe for production\./, 'pods page should call out the exact deployment blocker');
  assert.match(podsPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'pods blocker should name the missing production env');
});

test('pods page still keeps degraded recovery once production wiring is valid', () => {
  assert.match(podsPageSource, /Promise\.allSettled\(\[/, 'pods page should use Promise.allSettled for feed recovery');
  assert.match(podsPageSource, /Pods is running in degraded mode:/, 'pods page should keep the operator-facing degraded-state banner');
  assert.match(podsPageSource, /Do not treat this as proof the deployment footprint is clean\./, 'pods page should keep the honest empty-state warning');
});

test('pods page disables admin actions when the core pods feed is down instead of faking an empty registry', () => {
  assert.match(podsPageSource, /const hasCorePodGap = podsResult\.status === 'rejected';/, 'pods page should identify a core pods-feed outage');
  assert.match(podsPageSource, /disabled=\{hasCorePodGap\}/, 'pods page should disable add-pod controls while the registry feed is down');
  assert.match(podsPageSource, /Pod admin is degraded because the/, 'pods page should explain the registry outage plainly');
  assert.match(podsPageSource, /Pod registry unavailable\. Recover the pods feed before using pod admin actions\./, 'pods page should render an outage-safe registry row instead of pretending the table is empty');
});
