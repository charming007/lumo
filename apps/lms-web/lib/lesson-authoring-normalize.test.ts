import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAssessmentsForAuthoring,
  normalizeLessonForAuthoring,
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

test('normalizeAssessmentsForAuthoring converts malformed assessment feeds into safe rows and issues', () => {
  const normalized = normalizeAssessmentsForAuthoring([
    null,
    { id: 'assessment-1', title: 'Match the helpers', moduleTitle: 'Community helpers', subjectName: 'English', status: 'published', passingScore: 4 },
    { id: 'assessment-2', title: 'Broken row' },
  ]);

  assert.equal(normalized.items.length, 1);
  assert.equal(normalized.items[0]?.id, 'assessment-1');
  assert.equal(normalized.items[0]?.moduleTitle, 'Community helpers');
  assert.equal(normalized.items[0]?.subjectName, 'English');
  assert.deepEqual(normalized.issues, [
    'Assessment row 1 is malformed.',
    'Assessment row 3 is missing moduleTitle, subjectName.',
  ]);
});

test('normalizeLessonForAuthoring migrates legacy drag-to-match choices/media into drag items/targets on edit hydration', () => {
  const normalized = normalizeLessonForAuthoring({
    id: 'lesson-3',
    title: 'Handwashing before food',
    durationMinutes: 6,
    mode: 'guided',
    status: 'draft',
    activitySteps: [
      {
        id: 'life-2',
        type: 'drag_to_match',
        title: 'Match the routine',
        prompt: 'Drag each card to the right zone.',
        choices: [
          { id: 'card-water', label: 'Water', targetId: 'zone-start', media: { kind: 'image', value: 'asset:water-card' } },
          { id: 'card-soap', label: 'Soap', targetId: 'zone-middle', media: { kind: 'image', value: 'asset:soap-card' } },
        ],
        media: [
          { id: 'zone-start', prompt: 'First step', media: { kind: 'image', value: 'asset:start-zone' } },
          { id: 'zone-middle', prompt: 'Next step', media: { kind: 'image', value: 'asset:middle-zone' } },
        ],
      },
    ],
  });

  assert.ok(normalized.lesson);
  const step = normalized.lesson?.activitySteps?.[0];
  assert.equal(step?.type, 'drag_to_match');
  assert.equal(step?.dragItems?.length, 2);
  assert.equal(step?.dragItems?.[0]?.targetId, 'zone-start');
  assert.equal(step?.dragItems?.[0]?.media?.value, 'asset:water-card');
  assert.equal(step?.dragTargets?.length, 2);
  assert.equal(step?.dragTargets?.[0]?.id, 'zone-start');
  assert.equal(step?.dragTargets?.[0]?.prompt, 'First step');
  assert.equal(step?.dragTargets?.[0]?.media?.value, 'asset:start-zone');
});
