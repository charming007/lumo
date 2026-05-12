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
