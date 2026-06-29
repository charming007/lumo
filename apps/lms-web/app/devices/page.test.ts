import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const devicesPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('devices page hard-blocks when production API wiring is unsafe', () => {
  assert.match(devicesPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'devices page should block when the LMS API base is unsafe for production');
  assert.match(devicesPageSource, /Deployment blocker: devices API base URL is unsafe for production\./, 'devices page should call out the exact deployment blocker');
  assert.match(devicesPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'devices blocker should name the missing production env');
});

test('devices page hard-blocks when the registry or pod feeds degrade', () => {
  assert.match(devicesPageSource, /if \(failedSources\.length\)/, 'devices page should stop rendering the write surface when core rollout feeds fail');
  assert.match(devicesPageSource, /Deployment blocker: device rollout feeds are degraded\./, 'devices page should call out degraded rollout feeds as a deployment blocker');
  assert.match(devicesPageSource, /Leaving registration and reassignment controls interactive here would let operators move tablets, trust stale ownership, or create duplicates without seeing the real fleet state\./, 'devices page should explain the unsafe write failure mode it prevents');
  assert.match(devicesPageSource, /Pod linkage is the source of truth for tablet ownership and rollout geography\./, 'devices page should explain why missing pod data is deployment-blocking');
});

test('devices page still keeps an honest empty-state warning once feeds recover', () => {
  assert.match(devicesPageSource, /Promise\.allSettled\(\[/, 'devices page should use Promise.allSettled for feed recovery');
  assert.match(devicesPageSource, /No tablet registrations are loading right now\./, 'devices page should keep the honest empty-state warning');
});

test('devices page rollout coverage metrics stay honest about active tablets only', () => {
  assert.match(devicesPageSource, /const activeRegistrations = registrations\.filter\(\(item\) => \(item\.status \|\| ''\)\.toLowerCase\(\) === 'active'\);/, 'devices page should derive active registrations before rollout coverage metrics');
  assert.match(devicesPageSource, /const activeAssignedCount = activeRegistrations\.filter\(\(item\) => item\.podId\)\.length;/, 'devices page should count pod assignment coverage from active tablets only');
  assert.match(devicesPageSource, /const activePodCount = new Set\(activeRegistrations\.map\(\(item\) => item\.podId\)\.filter\(Boolean\)\)\.size;/, 'devices page should count receiving pods from active tablets only');
  assert.match(devicesPageSource, /\{ label: 'Active tablets assigned to pods', value: String\(activeAssignedCount\) \}/, 'devices snapshot should call out active pod-linked tablets instead of every pod-linked record');
  assert.match(devicesPageSource, /\['Pods receiving active tablets', String\(activePodCount\)\]/, 'devices page should label pod coverage as active-tablet coverage');
  assert.doesNotMatch(devicesPageSource, /\['Pods receiving devices', String\(new Set\(registrations\.map\(\(item\) => item\.podId\)\.filter\(Boolean\)\)\.size\)\]/, 'devices page should stop counting retired or inactive pod links as active rollout coverage');
});

test('devices page duplicate-pod metric matches the active-only rollout handoff rules', () => {
  assert.match(devicesPageSource, /import \{ getDeviceDeploymentReadiness \} from '\.\.\/\.\.\/lib\/device-deployment';/, 'devices page should reuse the shared rollout-readiness helper');
  assert.match(devicesPageSource, /const deviceDeploymentReadiness = getDeviceDeploymentReadiness\(registrations\);/, 'devices page should derive duplicate rollout scope from the shared readiness helper');
  assert.match(devicesPageSource, /filter\(\(entry\) => entry\.blockingReasons\.includes\('duplicate-live-scope'\) && entry\.registration\.podId\)/, 'devices page should only count pods that the shared rollout rules mark as duplicate live scope');
  assert.match(devicesPageSource, /\['Pods with duplicate tablets', String\(duplicateActivePodCount\)\]/, 'devices page duplicate metric should reflect the active-only rollout blocker count');
  assert.doesNotMatch(devicesPageSource, /item\.status \|\| ''\)\.toLowerCase\(\) !== 'retired'/, 'devices page should stop treating every non-retired extra tablet as a duplicate live-scope blocker');
});
