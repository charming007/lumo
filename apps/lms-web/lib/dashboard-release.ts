import { getModuleReleaseState } from './module-release.ts';
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
      const isDraftModule = module.status === 'draft';
      const blockerCount = releaseState.publishBlockers.length;
      const recoveredSubject = params.subjects.find((subject) => subject.id === releaseState.recoveredSubjectId) ?? null;

      if (!blockerCount) {
        return null;
      }

      return {
        id: module.id,
        title: module.title,
        subjectId: releaseState.recoveredSubjectId,
        subjectName: recoveredSubject?.name ?? module.subjectName ?? '—',
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
