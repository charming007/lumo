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

test('pods page hard-blocks when critical pod-admin feeds degrade', () => {
  assert.match(podsPageSource, /const criticalPodAdminFailures = \[/, 'pods page should identify the pod-admin feeds that are too important to degrade into a banner');
  assert.match(podsPageSource, /podsResult\.status === 'rejected' \? 'pods' : null/, 'pods registry failures should be treated as critical');
  assert.match(podsPageSource, /centersResult\.status === 'rejected' \? 'centers' : null/, 'center-reference failures should be treated as critical');
  assert.match(podsPageSource, /statesResult\.status === 'rejected' \? 'states' : null/, 'state-reference failures should be treated as critical');
  assert.match(podsPageSource, /localGovernmentsResult\.status === 'rejected' \? 'local governments' : null/, 'local government failures should be treated as critical');
  assert.match(podsPageSource, /mallamsResult\.status === 'rejected' \? 'mallams' : null/, 'mallam ownership failures should be treated as critical');
  assert.match(podsPageSource, /if \(criticalPodAdminFailures\.length\)/, 'pods page should hard-block when pod-admin reference feeds degrade');
  assert.match(podsPageSource, /Deployment blocker: pod admin feeds are degraded\./, 'pods page should render an explicit degraded-feed blocker headline');
  assert.match(podsPageSource, /Modal forms can still open with missing or stale geography and mallam references/, 'pods blocker should explain the unsafe interactive failure mode it prevents');
});

test('pods page still keeps honest recovery copy for non-blocking context gaps', () => {
  assert.match(podsPageSource, /Promise\.allSettled\(\[/, 'pods page should use Promise.allSettled for feed recovery');
  assert.match(podsPageSource, /Pods is running in degraded mode:/, 'pods page should keep the operator-facing degraded-state banner for non-critical context feeds');
  assert.match(podsPageSource, /Do not treat this as proof the deployment footprint is clean\./, 'pods page should keep the honest empty-state warning');
});
