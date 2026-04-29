import test from 'node:test';
import assert from 'node:assert/strict';

import { buildContentReturnPath, buildScopedLessonCreateHref, normalizeFilterValue } from './content-return-path.ts';

test('normalizeFilterValue keeps the first query value when arrays arrive from Next search params', () => {
  assert.equal(normalizeFilterValue(['math', 'english']), 'math');
  assert.equal(normalizeFilterValue('english'), 'english');
  assert.equal(normalizeFilterValue(undefined), '');
});

test('buildContentReturnPath preserves the active content filters', () => {
  assert.equal(
    buildContentReturnPath({ q: 'Reading lane', subject: 'english', status: 'draft', view: 'blocked' }),
    '/content?q=Reading+lane&subject=english&status=draft&view=blocked',
  );
});

test('buildContentReturnPath falls back to the root content board when no filters exist', () => {
  assert.equal(buildContentReturnPath(), '/content');
});

test('buildScopedLessonCreateHref keeps the full blocker-board return path instead of dumping operators into a generic board', () => {
  assert.equal(
    buildScopedLessonCreateHref({
      subjectId: 'subject-english',
      moduleId: 'module-reading-1',
      returnPath: '/content?view=blocked&subject=subject-english&q=Reading lane',
    }),
    '/content/lessons/new?subjectId=subject-english&moduleId=module-reading-1&from=%2Fcontent%3Fview%3Dblocked%26subject%3Dsubject-english%26q%3DReading+lane&focus=blockers',
  );
});

test('buildScopedLessonCreateHref omits focus when the caller does not want one', () => {
  assert.equal(
    buildScopedLessonCreateHref({
      subjectId: 'subject-math',
      moduleId: 'module-counting-1',
      returnPath: '/content',
      focus: ' ',
    }),
    '/content/lessons/new?subjectId=subject-math&moduleId=module-counting-1&from=%2Fcontent',
  );
});
