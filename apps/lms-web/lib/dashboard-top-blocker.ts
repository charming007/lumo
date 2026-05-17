export function resolveTopReleaseBlockerCta(params: {
  missingLessons: number;
  hasAuthoringContext: boolean;
  subjectMetadataDegraded: boolean;
}) {
  const canLaunchLessonStudio = params.missingLessons === 1
    && params.hasAuthoringContext;

  if (canLaunchLessonStudio) {
    return {
      canLaunchLessonStudio: true,
      label: 'Create missing lesson',
    } as const;
  }

  if (params.missingLessons > 1 && params.hasAuthoringContext) {
    return {
      canLaunchLessonStudio: false,
      label: `Open bulk lesson shell flow (${params.missingLessons})`,
    } as const;
  }

  if (params.subjectMetadataDegraded) {
    return {
      canLaunchLessonStudio: false,
      label: 'Review blocker context first',
    } as const;
  }

  if (params.missingLessons > 0) {
    return {
      canLaunchLessonStudio: false,
      label: 'Recover subject context first',
    } as const;
  }

  return {
    canLaunchLessonStudio: false,
    label: 'Open exact blocker',
  } as const;
}
