import test from 'node:test';
import assert from 'node:assert/strict';

import { assessmentMatchesModule, isLiveAssessmentGate } from './module-assessment-match';
import { filterLessonsForModule } from './module-lesson-match';

test('dashboard module matching keeps same-title lessons and live assessment gates together when subject context matches', () => {
  const module = {
    id: 'module-arabic-reading',
    title: 'Reading Foundations',
    subjectId: 'subject-arabic',
    subjectName: 'Arabic',
    lessonCount: 2,
    status: 'published',
  };

  const lessons = [
    {
      id: 'lesson-1',
      moduleId: null,
      moduleTitle: 'Reading Foundations',
      subjectId: 'subject-arabic',
      subjectName: 'Arabic',
      status: 'approved',
    },
    {
      id: 'lesson-2',
      moduleId: null,
      moduleTitle: 'Reading Foundations',
      subjectId: 'subject-arabic',
      subjectName: 'Arabic',
      status: 'published',
    },
    {
      id: 'lesson-other-subject',
      moduleId: null,
      moduleTitle: 'Reading Foundations',
      subjectId: 'subject-english',
      subjectName: 'English',
      status: 'published',
    },
  ];

  const assessments = [
    {
      id: 'assessment-1',
      moduleId: null,
      moduleTitle: 'Reading Foundations',
      subjectId: 'subject-arabic',
      subjectName: 'Arabic',
      status: 'active',
    },
    {
      id: 'assessment-draft',
      moduleId: null,
      moduleTitle: 'Reading Foundations',
      subjectId: 'subject-arabic',
      subjectName: 'Arabic',
      status: 'draft',
    },
    {
      id: 'assessment-other-subject',
      moduleId: null,
      moduleTitle: 'Reading Foundations',
      subjectId: 'subject-english',
      subjectName: 'English',
      status: 'active',
    },
  ];

  const matchedLessons = filterLessonsForModule(lessons as any, module as any);
  const matchedLiveGates = assessments.filter((assessment) => assessmentMatchesModule(module as any, assessment as any) && isLiveAssessmentGate(assessment as any));

  assert.equal(matchedLessons.length, 2);
  assert.deepEqual(matchedLessons.map((lesson) => lesson.id), ['lesson-1', 'lesson-2']);
  assert.equal(matchedLiveGates.length, 1);
  assert.deepEqual(matchedLiveGates.map((assessment) => assessment.id), ['assessment-1']);
});

test('module matching falls back to title-only linkage when neither side has subject context', () => {
  const module = {
    id: 'module-no-subject',
    title: 'Starter Numbers',
    subjectId: null,
    subjectName: null,
    lessonCount: 1,
    status: 'published',
  };

  const lessons = [
    {
      id: 'lesson-no-subject',
      moduleId: null,
      moduleTitle: 'Starter Numbers',
      subjectId: null,
      subjectName: null,
      status: 'approved',
    },
  ];

  const assessments = [
    {
      id: 'assessment-no-subject',
      moduleId: null,
      moduleTitle: 'Starter Numbers',
      subjectId: null,
      subjectName: null,
      status: 'active',
    },
  ];

  assert.equal(filterLessonsForModule(lessons as any, module as any).length, 1);
  assert.equal(assessments.filter((assessment) => assessmentMatchesModule(module as any, assessment as any) && isLiveAssessmentGate(assessment as any)).length, 1);
});
