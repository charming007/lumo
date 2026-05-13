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

test('students page blocks when core learner roster feeds degrade instead of leaving write surfaces interactive', () => {
  assert.match(studentsPageSource, /const criticalRosterFailures = \[/, 'students page should isolate the core learner-reference feeds that are too important to degrade into a polite warning');
  assert.match(studentsPageSource, /if \(criticalRosterFailures\.length\)/, 'students page should hard-block when the core learner roster feeds are down');
  assert.match(studentsPageSource, /Deployment blocker: learner roster feeds are degraded\./, 'students page should call out degraded learner roster feeds as a deployment blocker');
  assert.match(studentsPageSource, /Operators use this route to enroll learners, reassign pod ownership, change cohort placement, and manage live roster records\./, 'students page should explain why this route becomes dangerous when core learner feeds disappear');
  assert.match(studentsPageSource, /State and local government labels can degrade separately as supporting geography context, but the roster and write paths should stop cold when the core learner-reference feeds are missing\./, 'students page should distinguish tolerable geography degradation from deployment-blocking roster blindness');
  assert.match(studentsPageSource, /Forms stay interactive while the core reference feeds are missing or stale/, 'students page should describe the unsafe write failure mode it prevents');
});

test('students page still keeps an honest degraded geography shell once core feeds recover', () => {
  assert.match(studentsPageSource, /Promise\.allSettled\(\[/, 'students page should use Promise.allSettled for roster recovery');
  assert.match(studentsPageSource, /Learner admin recovered with degraded feeds:/, 'students page should show an operator-facing degraded-state banner for non-critical feed loss');
  assert.match(studentsPageSource, /Showing .* with degraded geography context because one of the support feeds is down\./, 'students page should keep degraded geography copy once only support feeds are missing');
  assert.match(studentsPageSource, /disabled=\{hasCoreRosterGap\}/, 'students page should still disable learner creation if the core roster feed itself is down');
});
