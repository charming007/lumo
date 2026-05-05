import test from 'node:test';
import assert from 'node:assert/strict';

import { getDashboardReleaseBlockers } from './dashboard-release.ts';
import type { Assessment, CurriculumModule, Lesson, Subject } from './types';

test('dashboard release blockers stay clear when the shared release state allows publish', () => {
  const blockers = getDashboardReleaseBlockers({
    modules: [{
      id: 'module-1',
      title: 'Readiness lane',
      subjectId: 'legacy-readiness-id',
      subjectName: 'Lumo Readiness',
      lessonCount: 2,
      status: 'review',
    } as CurriculumModule],
    lessons: [
      { id: 'lesson-1', title: 'Lesson 1', moduleId: 'module-1', subjectId: 'subject-readiness', status: 'approved' },
      { id: 'lesson-2', title: 'Lesson 2', moduleId: 'module-1', subjectId: 'subject-readiness', status: 'published' },
    ] as Lesson[],
    assessments: [
      { id: 'assessment-1', moduleId: 'module-1', moduleTitle: 'Readiness lane', trigger: 'module-complete', status: 'active' },
    ] as Assessment[],
    subjects: [{ id: 'subject-readiness', name: 'Lumo Readiness' }] as Subject[],
  });

  assert.deepEqual(blockers, []);
});

test('dashboard release blockers inherit shared publish blockers instead of reimplementing them', () => {
  const blockers = getDashboardReleaseBlockers({
    modules: [{
      id: 'module-2',
      title: 'Gate drift lane',
      subjectId: 'subject-readiness',
      subjectName: 'Lumo Readiness',
      lessonCount: 2,
      status: 'review',
    } as CurriculumModule],
    lessons: [
      { id: 'lesson-1', title: 'Lesson 1', moduleId: 'module-2', subjectId: 'subject-readiness', status: 'approved' },
    ] as Lesson[],
    assessments: [] as Assessment[],
    subjects: [{ id: 'subject-readiness', name: 'Lumo Readiness' }] as Subject[],
  });

  assert.equal(blockers.length, 1);
  assert.equal(blockers[0]?.title, 'Gate drift lane');
  assert.equal(blockers[0]?.missingLessons, 1);
  assert.equal(blockers[0]?.hasAssessmentGate, false);
  assert.equal(blockers[0]?.blockerCount, 2);
});

test('dashboard release blockers recover the subject name from live subject metadata when module copy is stale', () => {
  const modules: CurriculumModule[] = [
    {
      id: 'module-reading-1',
      title: 'Reading Foundations',
      status: 'published',
      lessonCount: 2,
      subjectId: 'subject-reading',
      subjectName: '',
    },
  ];

  const lessons: Lesson[] = [
    {
      id: 'lesson-1',
      title: 'Lesson 1',
      status: 'approved',
      moduleId: 'module-reading-1',
    },
  ];

  const blockers = getDashboardReleaseBlockers({
    modules,
    lessons,
    assessments: [],
    subjects: [
      {
        id: 'subject-reading',
        name: 'Reading',
      },
    ],
  });

  assert.equal(blockers.length, 1);
  assert.equal(blockers[0]?.subjectName, 'Reading');
  assert.equal(blockers[0]?.hasAuthoringContext, true);
});

test('dashboard release blockers keep recoverable subject context when subject metadata feed is unavailable', () => {
  const blockers = getDashboardReleaseBlockers({
    modules: [{
      id: 'module-3',
      title: 'Recovered subject lane',
      subjectId: 'subject-recovered',
      subjectName: 'Recovered Subject',
      lessonCount: 1,
      status: 'review',
    } as CurriculumModule],
    lessons: [] as Lesson[],
    assessments: [] as Assessment[],
    subjects: [] as Subject[],
  });

  assert.equal(blockers.length, 1);
  assert.equal(blockers[0]?.subjectId, 'subject-recovered');
  assert.equal(blockers[0]?.subjectName, 'Recovered Subject');
  assert.equal(blockers[0]?.hasAuthoringContext, true);
});
