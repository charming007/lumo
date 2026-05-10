import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const reportsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('reports route hard-blocks when production API wiring is unsafe', () => {
  assert.match(reportsPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'reports route should block when the LMS API base is unsafe for production');
  assert.match(reportsPageSource, /Deployment blocker: reports API base URL is unsafe for production\./, 'reports route should call out the exact deployment blocker');
  assert.match(reportsPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'reports blocker should name the missing production env');
  assert.match(reportsPageSource, /reports would otherwise render polished zeroes and fake calm/, 'reports blocker should explain why silent zero-value fallback is unsafe');
});

test('reports route blocks when core evidence feeds degrade instead of rendering fake-zero fallback cards', () => {
  assert.match(reportsPageSource, /const criticalReportFailures = \[/, 'reports should isolate the core evidence feeds that are too important to flatten into empty report objects');
  assert.match(reportsPageSource, /if \(criticalReportFailures\.length\)/, 'reports should hard-block when the core evidence feeds are down');
  assert.match(reportsPageSource, /Deployment blocker: reports evidence feeds are degraded\./, 'reports should use an explicit degraded-evidence blocker headline');
  assert.match(reportsPageSource, /All-zero cards or empty summary sections appear while core report feeds are down/, 'reports blocker should describe the exact fake-calm failure mode it prevents');
  assert.match(reportsPageSource, /Rewards detail can degrade separately, but if overview, NGO summary, or operations evidence disappears, this route should stop the rollout conversation immediately\./, 'reports blocker should distinguish tolerable reward-detail degradation from core evidence loss');
});
