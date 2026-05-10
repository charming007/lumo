import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const studentsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('students page hard-blocks when production API wiring is unsafe', () => {
  assert.match(studentsPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'students page should block when the LMS API base is unsafe for production');
  assert.match(studentsPageSource, /Deployment blocker: students API base URL is unsafe for production\./, 'students page should call out the exact deployment blocker');
  assert.match(studentsPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'students blocker should name the missing production env');
});

test('students page degrades instead of hard-failing on support feed outages', () => {
  assert.match(studentsPageSource, /Promise\.allSettled\(\[/, 'students page should use Promise.allSettled for roster recovery');
  assert.match(studentsPageSource, /const failedSources = \[/, 'students page should surface failed feed labels');
  assert.match(studentsPageSource, /Learner admin recovered with degraded feeds:/, 'students page should show an operator-facing degraded-state banner');
  assert.match(studentsPageSource, /The page stays visible so operators get an honest outage surface instead of a crash/, 'students page should keep the roster shell honest when the core feed is down');
});

test('students page blocks learner writes when the core roster feed is unavailable', () => {
  assert.match(studentsPageSource, /disabled=\{hasCoreRosterGap\}/, 'students page should disable learner creation when the core roster feed is down');
  assert.match(studentsPageSource, /Learner roster unavailable\. Recover the students feed before using learner admin actions\./, 'students page should keep the table honest when learner rows are unavailable');
  assert.match(studentsPageSource, /Learner roster feed is unavailable, so this page is showing an outage-safe shell instead of pretending the roster is empty\./, 'students page should explain why the roster shell is still visible during outages');
});
