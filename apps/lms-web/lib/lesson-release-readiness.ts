import type { Lesson } from './types';

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export function lessonHasLaunchableActivityPayload(lesson: Pick<Lesson, 'activityCount' | 'activitySteps' | 'activities'>) {
  if (typeof lesson.activityCount === 'number') {
    return lesson.activityCount > 0;
  }

  if (Array.isArray(lesson.activitySteps)) {
    return lesson.activitySteps.length > 0;
  }

  if (Array.isArray(lesson.activities)) {
    return lesson.activities.length > 0;
  }

  return false;
}

export function isLessonReleaseReady(lesson: Pick<Lesson, 'status' | 'activityCount' | 'activitySteps' | 'activities'>) {
  return ['approved', 'published', 'active'].includes(normalize(lesson.status))
    && lessonHasLaunchableActivityPayload(lesson);
}
