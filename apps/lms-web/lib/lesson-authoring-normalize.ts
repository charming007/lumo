import type { Lesson, LessonActivityChoice, LessonActivityMedia, LessonActivityStep, LessonAssessmentItem, LessonAsset } from './types';

type LessonAuthoringNormalization = {
  lesson: Lesson | null;
  issues: string[];
};

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function normalizeMedia(value: unknown): LessonActivityMedia | null {
  if (!value || typeof value !== 'object') return null;
  const media = value as Record<string, unknown>;
  const rawValue = media.value;
  const normalizedValue = Array.isArray(rawValue)
    ? rawValue.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : typeof rawValue === 'string'
      ? rawValue
      : null;

  return {
    kind: asString(media.kind, 'image'),
    value: normalizedValue,
  };
}

function normalizeChoice(value: unknown, index: number): LessonActivityChoice | null {
  if (!value || typeof value !== 'object') return null;
  const choice = value as Record<string, unknown>;
  return {
    id: asString(choice.id, `choice-${index + 1}`),
    label: asString(choice.label, `Choice ${index + 1}`),
    isCorrect: typeof choice.isCorrect === 'boolean' ? choice.isCorrect : false,
    media: normalizeMedia(choice.media),
  };
}

function normalizeStep(value: unknown, index: number): LessonActivityStep | null {
  if (!value || typeof value !== 'object') return null;
  const step = value as Record<string, unknown>;
  return {
    id: asString(step.id, `activity-${index + 1}`),
    order: asNumber(step.order, index + 1),
    type: asString(step.type, 'speak_answer'),
    title: asString(step.title, asString(step.prompt, `Activity ${index + 1}`)),
    prompt: asString(step.prompt, asString(step.title, `Activity ${index + 1}`)),
    durationMinutes: asNumber(step.durationMinutes, 2),
    detail: asString(step.detail),
    evidence: asString(step.evidence),
    expectedAnswers: asStringArray(step.expectedAnswers),
    tags: asStringArray(step.tags),
    facilitatorNotes: asStringArray(step.facilitatorNotes),
    choices: Array.isArray(step.choices)
      ? step.choices.map((choice, choiceIndex) => normalizeChoice(choice, choiceIndex)).filter(Boolean) as LessonActivityChoice[]
      : [],
    media: Array.isArray(step.media)
      ? step.media.map((media) => normalizeMedia(media)).filter(Boolean) as LessonActivityMedia[]
      : [],
  };
}

function normalizeAssessmentItem(value: unknown, index: number): LessonAssessmentItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  return {
    id: asString(item.id, `assessment-item-${index + 1}`),
    prompt: asString(item.prompt),
    evidence: asString(item.evidence),
  };
}

export function normalizeLessonAssetsForAuthoring(payload: unknown) {
  if (!Array.isArray(payload)) {
    return { assets: [] as LessonAsset[], issues: payload == null ? [] : ['Asset feed returned a non-array payload.'] };
  }

  const issues: string[] = [];
  const assets = payload.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      issues.push(`Asset row ${index + 1} is malformed.`);
      return [];
    }

    const asset = entry as Record<string, unknown>;
    const id = asString(asset.id).trim();
    if (!id) {
      issues.push(`Asset row ${index + 1} is missing an id.`);
      return [];
    }

    return [{
      id,
      kind: asString(asset.kind, 'image'),
      title: asString(asset.title, id),
      description: typeof asset.description === 'string' ? asset.description : undefined,
      tags: Array.isArray(asset.tags) ? asset.tags.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : undefined,
      subjectId: asNullableString(asset.subjectId),
      subjectName: asNullableString(asset.subjectName),
      moduleId: asNullableString(asset.moduleId),
      moduleTitle: asNullableString(asset.moduleTitle),
      lessonId: asNullableString(asset.lessonId),
      lessonTitle: asNullableString(asset.lessonTitle),
      mimeType: asNullableString(asset.mimeType),
      fileName: asNullableString(asset.fileName),
      originalFileName: asNullableString(asset.originalFileName),
      sizeBytes: typeof asset.sizeBytes === 'number' && Number.isFinite(asset.sizeBytes) ? asset.sizeBytes : null,
      storagePath: asNullableString(asset.storagePath),
      fileUrl: asNullableString(asset.fileUrl),
      status: typeof asset.status === 'string' ? asset.status : undefined,
      source: asNullableString(asset.source),
      createdBy: asNullableString(asset.createdBy),
      createdAt: asNullableString(asset.createdAt),
      updatedAt: asNullableString(asset.updatedAt),
    } satisfies LessonAsset];
  });

  return { assets, issues };
}

export function normalizeLessonForAuthoring(payload: unknown): LessonAuthoringNormalization {
  if (!payload || typeof payload !== 'object') {
    return { lesson: null, issues: ['Lesson payload is missing or not an object.'] };
  }

  const lesson = payload as Record<string, unknown>;
  const issues: string[] = [];
  if (typeof lesson.id !== 'string' || lesson.id.trim().length === 0) issues.push('Lesson id is missing.');
  if (typeof lesson.title !== 'string' || lesson.title.trim().length === 0) issues.push('Lesson title is missing.');

  const activitySource = Array.isArray(lesson.activitySteps)
    ? lesson.activitySteps
    : Array.isArray(lesson.activities)
      ? lesson.activities
      : [];
  if ((Array.isArray(lesson.activitySteps) && lesson.activitySteps.some((step) => !step || typeof step !== 'object'))
    || (Array.isArray(lesson.activities) && lesson.activities.some((step) => !step || typeof step !== 'object'))) {
    issues.push('Lesson activity steps contain malformed entries.');
  }
  if (lesson.lessonAssessment && typeof lesson.lessonAssessment === 'object' && Array.isArray((lesson.lessonAssessment as Record<string, unknown>).items)
    && ((lesson.lessonAssessment as Record<string, unknown>).items as unknown[]).some((item) => !item || typeof item !== 'object')) {
    issues.push('Lesson assessment items contain malformed entries.');
  }

  if (issues.some((issue) => /id|title/.test(issue.toLowerCase()))) {
    return { lesson: null, issues };
  }

  const rawAssessment = lesson.lessonAssessment && typeof lesson.lessonAssessment === 'object'
    ? lesson.lessonAssessment as Record<string, unknown>
    : null;

  const normalizedLesson: Lesson = {
    id: asString(lesson.id),
    title: asString(lesson.title),
    order: typeof lesson.order === 'number' ? lesson.order : null,
    subjectId: asNullableString(lesson.subjectId),
    moduleId: asNullableString(lesson.moduleId),
    subjectName: asNullableString(lesson.subjectName),
    moduleTitle: asNullableString(lesson.moduleTitle),
    durationMinutes: asNumber(lesson.durationMinutes, 0),
    mode: asString(lesson.mode, 'guided'),
    status: asString(lesson.status, 'draft'),
    targetAgeRange: asNullableString(lesson.targetAgeRange),
    voicePersona: asNullableString(lesson.voicePersona),
    learningObjectives: asStringArray(lesson.learningObjectives),
    localization: lesson.localization && typeof lesson.localization === 'object' ? lesson.localization as Record<string, unknown> : null,
    lessonAssessment: rawAssessment ? {
      ...rawAssessment,
      title: asString(rawAssessment.title),
      kind: asString(rawAssessment.kind, 'observational'),
      items: Array.isArray(rawAssessment.items)
        ? rawAssessment.items.map((item, index) => normalizeAssessmentItem(item, index)).filter(Boolean) as LessonAssessmentItem[]
        : [],
    } : null,
    activityCount: typeof lesson.activityCount === 'number' ? lesson.activityCount : undefined,
    activityTypes: asStringArray(lesson.activityTypes),
    activitySteps: activitySource.map((step, index) => normalizeStep(step, index)).filter(Boolean) as LessonActivityStep[],
    activities: activitySource.map((step, index) => normalizeStep(step, index)).filter(Boolean) as LessonActivityStep[],
  };

  return { lesson: normalizedLesson, issues };
}
