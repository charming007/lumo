import test from 'node:test';
import assert from 'node:assert/strict';

import { getModuleReleaseState } from './module-release.ts';

test('getModuleReleaseState allows publish when subject context, ready lessons, and gate all exist', () => {
  const state = getModuleReleaseState({
    module: {
      id: 'module-1',
      title: 'Readiness lane',
      subjectId: 'legacy-readiness-id',
      subjectName: 'Lumo Readiness',
      lessonCount: 2,
      status: 'review',
    } as any,
    lessons: [
      { id: 'lesson-1', title: 'Lesson 1', moduleId: 'module-1', subjectId: 'subject-readiness', status: 'approved' },
      { id: 'lesson-2', title: 'Lesson 2', moduleId: 'module-1', subjectId: 'subject-readiness', status: 'published' },
    ] as any,
    assessments: [
      { id: 'assessment-1', moduleId: 'module-1', moduleTitle: 'Readiness lane', trigger: 'module-complete', status: 'active' },
    ] as any,
    subjects: [{ id: 'subject-readiness', name: 'Lumo Readiness' }],
  });

  assert.equal(state.recoveredSubjectId, 'subject-readiness');
  assert.equal(state.canReview, true);
  assert.equal(state.canPublish, true);
  assert.deepEqual(state.publishBlockers, []);
});

test('getModuleReleaseState blocks publish when ready lessons or gate are missing', () => {
  const state = getModuleReleaseState({
    module: {
      id: 'module-2',
      title: 'Readiness lane',
      subjectId: 'subject-readiness',
      subjectName: 'Lumo Readiness',
      lessonCount: 2,
      status: 'draft',
    } as any,
    lessons: [
      { id: 'lesson-1', title: 'Lesson 1', moduleId: 'module-2', subjectId: 'subject-readiness', status: 'review' },
    ] as any,
    assessments: [] as any,
    subjects: [{ id: 'subject-readiness', name: 'Lumo Readiness' }],
  });

  assert.equal(state.canReview, true);
  assert.equal(state.canPublish, false);
  assert.deepEqual(state.publishBlockers, [
    '2 ready lessons still missing before publish.',
    'Add the assessment gate before publish.',
  ]);
});

test('getModuleReleaseState blocks review and publish when subject context cannot be recovered', () => {
  const state = getModuleReleaseState({
    module: {
      id: 'module-3',
      title: 'Broken lane',
      subjectId: 'legacy-missing',
      subjectName: 'Unknown',
      lessonCount: 0,
      status: 'draft',
    } as any,
    lessons: [] as any,
    assessments: [] as any,
    subjects: [{ id: 'subject-readiness', name: 'Lumo Readiness' }],
  });

  assert.equal(state.canReview, false);
  assert.equal(state.canPublish, false);
  assert.deepEqual(state.reviewBlockers, ['Recover the module subject context before sending this lane to review.']);
  assert.equal(state.publishBlockers[0], 'Recover the module subject context before moving this lane forward.');
});

test('getModuleReleaseState keeps subject context recoverable when ids only differ by case or whitespace', () => {
  const state = getModuleReleaseState({
    module: {
      id: 'module-4',
      title: 'Recovered lane',
      subjectId: ' subject-readiness ',
      subjectName: 'Lumo Readiness',
      lessonCount: 1,
      status: 'review',
    } as any,
    lessons: [
      { id: 'lesson-1', title: 'Lesson 1', moduleId: 'module-4', subjectId: 'subject-readiness', status: 'approved' },
    ] as any,
    assessments: [
      { id: 'assessment-1', moduleId: 'module-4', moduleTitle: 'Recovered lane', trigger: 'module-complete', status: 'active' },
    ] as any,
    subjects: [{ id: 'SUBJECT-READINESS', name: 'Lumo Readiness' }],
  });

  assert.equal(state.recoveredSubjectId, 'SUBJECT-READINESS');
  assert.equal(state.hasRecoverableSubjectContext, true);
  assert.equal(state.canReview, true);
  assert.equal(state.canPublish, true);
});
