import { getModuleReleaseState } from './module-release.ts';
import { isDraftModuleLifecycleStatus } from './module-status.ts';
import { findSubjectByContext } from './module-subject-match.ts';
import type { Assessment, CurriculumModule, Lesson, Subject } from './types';

export type DashboardReleaseBlocker = {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  missingLessons: number;
  hasAssessmentGate: boolean;
  isDraftModule: boolean;
  hasAuthoringContext: boolean;
  blockerCount: number;
  priorityWeight: number;
};

export function getDashboardReleaseBlockers(params: {
  modules: CurriculumModule[];
  lessons: Lesson[];
  assessments: Assessment[];
  subjects: Subject[];
}) {
  return params.modules
    .map((module) => {
      const releaseState = getModuleReleaseState({
        module,
        lessons: params.lessons,
        assessments: params.assessments,
        subjects: params.subjects,
      });
      const missingLessons = releaseState.missingReadyLessons;
      const hasAssessmentGate = releaseState.hasAssessmentGate;
      const isDraftModule = isDraftModuleLifecycleStatus(module.status);
      const blockerCount = releaseState.publishBlockers.length;
      const lessonSubjectContext = releaseState.moduleLessons.find((lesson) => lesson.subjectId?.trim() || lesson.subjectName?.trim()) ?? null;
      const recoveredSubject = findSubjectByContext(params.subjects, {
        subjectId: releaseState.recoveredSubjectId,
        subjectName: module.subjectName,
      }) ?? findSubjectByContext(params.subjects, {
        subjectId: lessonSubjectContext?.subjectId,
        subjectName: lessonSubjectContext?.subjectName,
      });

      if (!blockerCount) {
        return null;
      }

      return {
        id: module.id,
        title: module.title,
        subjectId: releaseState.recoveredSubjectId,
        subjectName: recoveredSubject?.name ?? module.subjectName ?? lessonSubjectContext?.subjectName ?? '—',
        missingLessons,
        hasAssessmentGate,
        isDraftModule,
        hasAuthoringContext: releaseState.hasRecoverableSubjectContext,
        blockerCount,
        priorityWeight: !hasAssessmentGate && !isDraftModule
          ? 4
          : !isDraftModule
            ? 3
            : !hasAssessmentGate
              ? 2
              : 1,
      } satisfies DashboardReleaseBlocker;
    })
    .filter((module): module is DashboardReleaseBlocker => Boolean(module))
    .sort((left, right) => right.priorityWeight - left.priorityWeight || right.blockerCount - left.blockerCount || right.missingLessons - left.missingLessons || left.title.localeCompare(right.title));
}
