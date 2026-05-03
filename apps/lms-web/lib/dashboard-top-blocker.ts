export function resolveTopReleaseBlockerCta(params: {
  missingLessons: number;
  hasAuthoringContext: boolean;
  subjectMetadataDegraded: boolean;
}) {
  const canLaunchLessonStudio = params.missingLessons > 0
    && params.hasAuthoringContext;

  if (canLaunchLessonStudio) {
    return {
      canLaunchLessonStudio: true,
      label: params.missingLessons === 1 ? 'Create missing lesson' : `Create ${params.missingLessons} missing lessons`,
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
