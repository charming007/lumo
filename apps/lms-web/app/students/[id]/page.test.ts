import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const studentDetailPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('student detail page hard-blocks when production API wiring is unsafe', () => {
  assert.match(studentDetailPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'student detail page should block when the LMS API base is unsafe for production');
  assert.match(studentDetailPageSource, /Deployment blocker: learner detail API base URL is unsafe for production\./, 'student detail blocker should call out the exact deployment blocker');
  assert.match(studentDetailPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'student detail blocker should name the missing production env');
});

test('student detail page blocks instead of 404ing when the live learner feed is degraded', () => {
  assert.match(studentDetailPageSource, /studentResult\.status === 'rejected'/, 'student detail page should explicitly detect learner feed failure');
  assert.match(studentDetailPageSource, /Deployment blocker: learner detail feed is unavailable\./, 'student detail page should surface a degraded-feed blocker instead of falling through to notFound');
  assert.match(studentDetailPageSource, /Treating a failed learner lookup as “student not found” would hide a live outage behind a fake 404\./, 'student detail page should explain why degraded feeds cannot masquerade as missing records');
});

test('student detail page hard-blocks when core roster references degrade', () => {
  assert.match(studentDetailPageSource, /criticalLearnerDetailFailures/, 'student detail page should name the critical learner-detail reference failures');
  assert.match(studentDetailPageSource, /Deployment blocker: learner detail roster-reference feeds are degraded\./, 'student detail page should surface a dedicated roster-reference blocker');
  assert.match(studentDetailPageSource, /Leaving learner detail up would let operators edit roster, geography, or mallam routing while the reference graph is blind\./, 'student detail page should explain why blind learner edits are unsafe');
  assert.match(studentDetailPageSource, /Reward history can degrade separately as supporting context, but learner detail should stop cold when the core roster-reference graph is missing\./, 'student detail page should keep rewards secondary while hard-blocking core roster failures');
});
