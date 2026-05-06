import type { DashboardReleaseBlocker } from './dashboard-release.ts';

export function resolveTopReleaseBlockerPrimaryHref(params: {
  blocker: DashboardReleaseBlocker | null;
  boardHref: string;
  canLaunchLessonStudio: boolean;
}) {
  const { blocker, boardHref, canLaunchLessonStudio } = params;

  if (!blocker) {
    return boardHref;
  }

  if (canLaunchLessonStudio) {
    return `/content/lessons/new?subjectId=${encodeURIComponent(blocker.subjectId)}&moduleId=${encodeURIComponent(blocker.id)}&from=${encodeURIComponent(boardHref)}&focus=blockers`;
  }

  if (blocker.missingLessons > 1 && blocker.hasAuthoringContext) {
    const params = new URLSearchParams();
    params.set('subject', blocker.subjectId);
    params.set('module', blocker.id);
    params.set('readiness', 'blocked');
    params.set('q', blocker.title);
    return `/canvas?${params.toString()}`;
  }

  return boardHref;
}
