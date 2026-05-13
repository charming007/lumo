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
