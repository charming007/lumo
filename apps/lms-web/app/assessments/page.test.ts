import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('assessments page hard-blocks when production API wiring is unsafe', () => {
  assert.match(source, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'assessments page should block when the LMS API base is unsafe for production');
  assert.match(source, /Deployment blocker: assessments API base URL is unsafe for production\./, 'assessments page should call out the exact deployment blocker');
  assert.match(source, /NEXT_PUBLIC_API_BASE_URL/, 'assessments blocker should name the missing production env');
  assert.match(source, /used to fetch immediately and explode on bad wiring/, 'assessments page should explain why the route now blocks before crashing');
});

test('assessments page hard-blocks when progression feeds degrade', () => {
  assert.match(source, /Promise\.allSettled\(\[/, 'assessments page should recover gracefully from feed outages');
  assert.match(source, /const criticalAssessmentFailures = \[/, 'assessments page should identify the degraded progression feeds that make writes unsafe');
  assert.match(source, /Deployment blocker: assessment progression feeds are degraded\./, 'assessments page should call out degraded progression feeds as a deployment blocker');
  assert.match(source, /Leaving assessment edits, deletes, or gate creation interactive here would let operators rewrite progression decisions while the curriculum reference graph is blind\./, 'assessments page should explain the unsafe write failure mode it prevents');
  assert.match(source, /Modules and subjects are the source of truth for where a gate belongs\./, 'assessments page should explain why missing curriculum references are deployment-blocking');
});


test('assessments page still keeps an honest empty-state warning once feeds recover', () => {
  assert.match(source, /Assessment creation is paused until the module and subject feeds load again\./, 'assessments page should keep the create flow honest when prerequisites are missing');
  assert.match(source, /Assessment registry unavailable\. Recover the assessments feed before using gate admin actions\./, 'assessments page should keep the registry honest instead of crashing');
});

test('assessments page uses subject-drift-safe filtering', () => {
  assert.match(source, /import \{ matchesSubjectFilter \} from '\.\.\/\.\.\/lib\/module-subject-match';/);
  assert.match(
    source,
    /const subjectMatches = matchesSubjectFilter\(subjectFilter, subjects, \{\s*subjectIds: \[assessment\.subjectId\],\s*subjectNames: \[assessment\.subjectName\],\s*\}\);/s,
  );
  assert.doesNotMatch(source, /assessment\.subjectId === subjectFilter/);
});
