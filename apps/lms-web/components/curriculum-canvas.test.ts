import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./curriculum-canvas.tsx', import.meta.url)), 'utf8');

test('curriculum canvas recovers subject selection from normalized context instead of exact id-only matching', () => {
  assert.match(
    source,
    /const nextSubject = data\.subjects\.find\(\(subject\) => subjectMatchesContext\(subject, \{[\s\S]*subjectIds: \[nextSubjectId\],[\s\S]*subjectNames: \[nextSubjectId\],[\s\S]*\}\)\) \?\? null;/s,
  );
  assert.doesNotMatch(source, /data\.subjects\.find\(\(subject\) => subject\.id === nextSubjectId\)/);
});

test('curriculum canvas blocker and module handoffs carry exact module ids into content views', () => {
  assert.match(
    source,
    /href=\{`\/content\?subject=\$\{selected\.subject\.id\}&moduleId=\$\{encodeURIComponent\(selected\.module\.id\)\}&q=\$\{encodeURIComponent\(selected\.module\.title\)\}`\}/,
  );
  assert.match(
    source,
    /href=\{`\/content\?view=blocked&subject=\$\{selected\.subject\.id\}&moduleId=\$\{encodeURIComponent\(selected\.module\.id\)\}&q=\$\{encodeURIComponent\(selected\.module\.title\)\}`\}/,
  );
  assert.match(
    source,
    /assessmentBoardHref\(\{ subjectId, moduleId: assessment\.moduleId \?\? undefined, query: moduleTitle \}\)/,
  );
  assert.match(
    source,
    /href=\{`\/content\?subject=\$\{encodeURIComponent\(subjectId\)\}\$\{assessment\.moduleId \? `&moduleId=\$\{encodeURIComponent\(assessment\.moduleId\)\}` : ''\}&q=\$\{encodeURIComponent\(moduleTitle\)\}`\}/,
  );
  assert.match(
    source,
    /href=\{`\/content\?view=blocked&subject=\$\{encodeURIComponent\(subjectId\)\}\$\{assessment\.moduleId \? `&moduleId=\$\{encodeURIComponent\(assessment\.moduleId\)\}` : ''\}&q=\$\{encodeURIComponent\(moduleTitle\)\}`\}/,
  );
});

test('curriculum canvas triage quick action keeps payload-empty published lessons in the not-ready queue', () => {
  assert.match(source, /import \{ getLessonStatusTransitionBlockers, isLessonReleaseReady \} from '\.\.\/lib\/lesson-release-readiness';/);
  assert.match(
    source,
    /const selectedModuleNotReadyLessons = selected \? selected\.module\.lessons\.filter\(\(lesson\) => !isLessonReleaseReady\(lesson\)\) : \[];/,
  );
  assert.match(
    source,
    /const selectedModuleApprovalBlockedLessons = selected \? selected\.module\.lessons\.filter\(\(lesson\) => getLessonStatusTransitionBlockers\('approved', lesson\)\.length > 0\) : \[];/,
  );
  assert.match(
    source,
    /<option value="approved" disabled=\{selectedModuleApprovalBlockedLessons\.length > 0\}>Move all to approved<\/option>/,
  );
  assert.doesNotMatch(
    source,
    /const selectedModuleNotReadyLessons = selected \? selected\.module\.lessons\.filter\(\(lesson\) => !\['approved', 'published', 'active'\]\.includes\(normalize\(lesson\.status\)\)\) : \[];/,
  );
});
