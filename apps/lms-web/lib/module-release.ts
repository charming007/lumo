import { assessmentMatchesModule, isLiveAssessmentGate } from './module-assessment-match.ts';
import { filterLessonsForModule } from './module-lesson-match.ts';
import { resolveModuleSubjectId } from './module-subject-match.ts';
import type { Assessment, CurriculumModule, Lesson, Subject } from './types';

type ModuleReleaseStateArgs = {
  module: CurriculumModule;
  lessons: Lesson[];
  assessments: Assessment[];
  subjects: Pick<Subject, 'id' | 'name'>[];
};

export function getModuleReleaseState({
  module,
  lessons,
  assessments,
  subjects,
}: ModuleReleaseStateArgs) {
  const moduleLessons = filterLessonsForModule(lessons, module);
  const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
  const missingReadyLessons = Math.max(module.lessonCount - readyLessonCount, 0);
  const hasAssessmentGate = assessments.some((assessment) => assessmentMatchesModule(module, assessment) && isLiveAssessmentGate(assessment));
  const recoveredSubjectId = resolveModuleSubjectId(module, subjects);
  const hasRecoverableSubjectContext = Boolean(recoveredSubjectId && subjects.some((subject) => subject.id === recoveredSubjectId));

  const publishBlockers = [
    hasRecoverableSubjectContext ? null : 'Recover the module subject context before moving this lane forward.',
    missingReadyLessons === 0 ? null : `${missingReadyLessons} ready lesson${missingReadyLessons === 1 ? '' : 's'} still missing before publish.`,
    hasAssessmentGate ? null : 'Add the assessment gate before publish.',
  ].filter(Boolean) as string[];

  const reviewBlockers = [
    hasRecoverableSubjectContext ? null : 'Recover the module subject context before sending this lane to review.',
  ].filter(Boolean) as string[];

  return {
    moduleLessons,
    readyLessonCount,
    missingReadyLessons,
    hasAssessmentGate,
    recoveredSubjectId,
    hasRecoverableSubjectContext,
    canReview: reviewBlockers.length === 0,
    canPublish: publishBlockers.length === 0,
    reviewBlockers,
    publishBlockers,
  };
}
