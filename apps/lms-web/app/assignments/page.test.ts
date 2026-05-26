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

test('assignments route blocks when core delivery feeds degrade instead of leaving write surfaces interactive', () => {
  assert.match(assignmentsPageSource, /const criticalAssignmentFailures = \[/, 'assignments should isolate the core delivery feeds that are too important to degrade into a polite warning');
  assert.match(assignmentsPageSource, /if \(criticalAssignmentFailures\.length\)/, 'assignments should hard-block when the core delivery feeds are down');
  assert.match(assignmentsPageSource, /Deployment blocker: assignments delivery feeds are degraded\./, 'assignments should use an explicit degraded-delivery blocker headline');
  assert.match(assignmentsPageSource, /Operators use this route to create, reassign, and triage live delivery windows\./, 'assignments blocker should explain why this route becomes dangerous when core feeds disappear');
  assert.match(assignmentsPageSource, /Assessments and pods can degrade separately, but the board and write paths should stop cold when the core delivery feeds are missing\./, 'assignments blocker should distinguish tolerable degradation from deployment-blocking control-surface blindness');
  assert.match(assignmentsPageSource, /Forms stay interactive while the core reference feeds are missing or stale/, 'assignments blocker should describe the unsafe write failure mode it prevents');
});

test('assignments route surfaces issue timestamps so ops can separate sync delay from actual breakage', () => {
  assert.match(assignmentsPageSource, /const assignmentsWithFreshness = filteredAssignments\.filter\(/, 'assignments should derive visible freshness from issued assignment timestamps');
  assert.match(assignmentsPageSource, /title="Assignment freshness" eyebrow="Is this broken or just delayed\?"/, 'assignments should make freshness an explicit operator panel, not hidden trivia');
  assert.match(assignmentsPageSource, /Issued \{formatRelativeTime\(item\.assignedAt\)\}/, 'assignment rows should show how old the issued assignment is');
  assert.match(assignmentsPageSource, /When the learner tablet says “waiting for sync,” this panel helps ops tell the difference between a genuinely fresh assignment and one that has been sitting long enough to suspect sync drift\./, 'assignments should explain why freshness matters operationally');
});
