import type { DashboardReleaseBlocker } from './dashboard-release.ts';

export function buildTopReleaseBlockerBoardHref(blocker: DashboardReleaseBlocker | null) {
  if (!blocker) {
    return '/content?view=blocked';
  }

  const params = new URLSearchParams();
  params.set('view', 'blocked');
  params.set('moduleId', blocker.id);

  const normalizedSubjectId = blocker.subjectId.trim();
  if (normalizedSubjectId) {
    params.set('subject', normalizedSubjectId);
  }

  params.set('q', blocker.title);
  return `/content?${params.toString()}`;
}

export function resolveTopReleaseBlockerPrimaryHref(params: {
  blocker: DashboardReleaseBlocker | null;
  boardHref: string;
  canLaunchLessonStudio: boolean;
}) {
  const { blocker, boardHref, canLaunchLessonStudio } = params;

  if (!blocker) {
    return boardHref;
  }

  const normalizedSubjectId = blocker.subjectId.trim();
  if (!normalizedSubjectId) {
    return boardHref;
  }

  if (canLaunchLessonStudio) {
    return `/content/lessons/new?subjectId=${encodeURIComponent(normalizedSubjectId)}&moduleId=${encodeURIComponent(blocker.id)}&from=${encodeURIComponent(boardHref)}&focus=blockers`;
  }

  if (blocker.missingLessons > 1 && blocker.hasAuthoringContext) {
    const params = new URLSearchParams();
    params.set('subject', normalizedSubjectId);
    params.set('module', blocker.id);
    params.set('readiness', 'blocked');
    params.set('q', blocker.title);
    return `/canvas?${params.toString()}`;
  }

  return boardHref;
}
