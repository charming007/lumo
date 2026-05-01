import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeLessonsForAuthoring,
  normalizeModulesForAuthoring,
  normalizeSubjectsForAuthoring,
} from './lesson-authoring-normalize.ts';

test('normalizeModulesForAuthoring converts non-array payloads into issues instead of leaving crashable values behind', () => {
  const normalized = normalizeModulesForAuthoring({ items: [] });

  assert.deepEqual(normalized.items, []);
  assert.deepEqual(normalized.issues, ['Module feed returned a non-array payload.']);
});

test('normalizeSubjectsForAuthoring drops malformed rows and keeps valid subject context', () => {
  const normalized = normalizeSubjectsForAuthoring([
    null,
    { id: 'subject-readiness', name: 'Lumo Readiness', status: 'live' },
    { id: 'missing-name' },
  ]);

  assert.equal(normalized.items.length, 1);
  assert.equal(normalized.items[0]?.id, 'subject-readiness');
  assert.equal(normalized.items[0]?.name, 'Lumo Readiness');
  assert.equal(normalized.items[0]?.status, 'live');
  assert.deepEqual(normalized.issues, [
    'Subject row 1 is malformed.',
    'Subject row 3 is missing name.',
  ]);
});

test('normalizeLessonsForAuthoring sanitizes authoring lessons instead of trusting raw payload shape', () => {
  const normalized = normalizeLessonsForAuthoring([
    { id: 'lesson-1', title: 'Intro to readiness', durationMinutes: 12, mode: 'guided', status: 'draft' },
    { id: '', title: 'Broken lesson' },
  ]);

  assert.equal(normalized.items.length, 1);
  assert.equal(normalized.items[0]?.id, 'lesson-1');
  assert.deepEqual(normalized.issues, ['Lesson row 2: Lesson id is missing.']);
});
