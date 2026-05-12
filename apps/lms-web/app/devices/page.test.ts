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

test('devices page still keeps degraded recovery once production wiring is valid', () => {
  assert.match(devicesPageSource, /Promise\.allSettled\(\[/, 'devices page should use Promise.allSettled for feed recovery');
  assert.match(devicesPageSource, /Devices is running in degraded mode:/, 'devices page should keep the operator-facing degraded-state banner');
  assert.match(devicesPageSource, /No tablet registrations are loading right now\./, 'devices page should keep the honest empty-state warning');
});
