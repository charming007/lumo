import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const assignmentsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('assignments route hard-blocks when production API wiring is unsafe', () => {
  assert.match(assignmentsPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'assignments route should block when the LMS API base is unsafe for production');
  assert.match(assignmentsPageSource, /Deployment blocker: assignments API base URL is unsafe for production\./, 'assignments route should call out the exact deployment blocker');
  assert.match(assignmentsPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'assignments blocker should name the missing production env');
  assert.match(assignmentsPageSource, /assignment operations are blocked instead of pretending delivery control still works/, 'assignments blocker should explain why silent fallback is unsafe');
});

test('assignments route blocks when core delivery feeds or assessment-gate evidence degrade instead of leaving write surfaces interactive', () => {
  assert.match(assignmentsPageSource, /const criticalAssignmentFailures = \[/, 'assignments should isolate the core delivery feeds that are too important to degrade into a polite warning');
  assert.match(assignmentsPageSource, /assessmentsResult\.status === 'rejected' \? 'assessments' : null,/, 'assignments should treat a dead assessment-gate feed as deployment-blocking instead of optional garnish');
  assert.match(assignmentsPageSource, /if \(criticalAssignmentFailures\.length\)/, 'assignments should hard-block when the core delivery feeds are down');
  assert.match(assignmentsPageSource, /Deployment blocker: assignments delivery feeds are degraded\./, 'assignments should use an explicit degraded-delivery blocker headline');
  assert.match(assignmentsPageSource, /Operators use this route to create, reassign, and triage live delivery windows\. If assignments, cohorts, lessons, mallams, or assessment gates disappear, a polished UI becomes dangerous fiction fast\./, 'assignments blocker should explain why this route becomes dangerous when core feeds or gate evidence disappear');
  assert.match(assignmentsPageSource, /Pods can degrade separately, but the board and write paths should stop cold when the core delivery feeds or assessment-gate evidence are missing\./, 'assignments blocker should distinguish tolerable pod degradation from deployment-blocking control-surface blindness');
  assert.match(assignmentsPageSource, /Forms stay interactive while the core reference feeds are missing or stale/, 'assignments blocker should describe the unsafe write failure mode it prevents');
});
