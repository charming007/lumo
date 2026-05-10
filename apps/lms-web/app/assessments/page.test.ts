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

test('assessments page uses subject-drift-safe filtering', () => {
  assert.match(source, /import \{ matchesSubjectFilter \} from '\.\.\/\.\.\/lib\/module-subject-match';/);
  assert.match(
    source,
    /const subjectMatches = matchesSubjectFilter\(subjectFilter, subjects, \{\s*subjectIds: \[assessment\.subjectId\],\s*subjectNames: \[assessment\.subjectName\],\s*\}\);/s,
  );
  assert.doesNotMatch(source, /assessment\.subjectId === subjectFilter/);
});
