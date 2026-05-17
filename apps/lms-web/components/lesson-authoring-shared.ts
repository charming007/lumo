import type { Lesson, LessonActivityChoice, LessonActivityDragItem, LessonActivityDragTarget, LessonActivityStep, LessonActivityMedia, LessonAudioReference } from '../lib/types';
import type { ActivityDraftLike } from './lesson-step-authoring';

export type LessonActivityDraft = {
  id: string;
  title: string;
  prompt: string;
  type: string;
  durationMinutes: string;
  detail: string;
  evidence: string;
  targetText: string;
  supportText: string;
  targetAudioAssetRef: string;
  supportAudioMode: string;
  supportAudioAssetRef: string;
  supportAudioPhraseId: string;
  supportAudioPhraseText: string;
  expectedAnswers: string;
  tags: string;
  facilitatorNotes: string;
  choiceLines: string;
  mediaLines: string;
};

export type ChoiceLineDraft = {
  id: string;
  label: string;
  correctness: string;
  mediaKind: string;
  mediaValue: string;
};

export type DragItemLineDraft = {
  id: string;
  label: string;
  targetId: string;
  mediaKind: string;
  mediaValue: string;
};

export type MediaLineDraft = {
  kind: string;
  value: string;
};

export type DragTargetLineDraft = {
  id: string;
  prompt: string;
  mediaKind: string;
  mediaValue: string;
};

const knownAssetKinds = ['image', 'audio', 'illustration', 'prompt-card', 'story-card', 'trace-card', 'letter-card', 'tile', 'word-card', 'hint', 'transcript'] as const;

function normalizeAssetKind(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase() || 'image';
}

function getAssetKindLabel(kind: string | null | undefined) {
  const normalized = normalizeAssetKind(kind);
  switch (normalized) {
    case 'image': return 'Image';
    case 'audio': return 'Audio';
    case 'illustration': return 'Illustration';
    case 'prompt-card': return 'Prompt card';
    case 'story-card': return 'Story card';
    case 'trace-card': return 'Trace card';
    case 'letter-card': return 'Letter card';
    case 'tile': return 'Tile';
    case 'word-card': return 'Word card';
    case 'hint': return 'Hint';
    case 'transcript': return 'Transcript';
    default: return normalized.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'Asset';
  }
}

function isKnownAssetKind(kind: string | null | undefined) {
  return knownAssetKinds.includes(normalizeAssetKind(kind) as typeof knownAssetKinds[number]);
}

function parseDelimitedValue(value: string) {
  return value.includes(',') ? value.split(',').map((item) => item.trim()).filter(Boolean) : value;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function serializeMediaValue(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? '')).join(', ')
    : String(value ?? '');
}

function parseAuthoringLines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

function serializeInlineMedia(media: unknown) {
  if (!media || typeof media !== 'object') return { kind: '', value: '' };
  const typed = media as { kind?: unknown; value?: unknown };
  const kind = typeof typed.kind === 'string' ? typed.kind : String(typed.kind ?? '');
  const value = 'value' in typed ? serializeMediaValue(typed.value) : '';
  return { kind, value };
}

function normalizeAudioReference(value: unknown): LessonAudioReference | null {
  if (!value || typeof value !== 'object') return null;
  const audio = value as Record<string, unknown>;
  const source = audio.source === 'phrase-bank' ? 'phrase-bank' : audio.source === 'asset' ? 'asset' : undefined;
  const assetId = typeof audio.assetId === 'string' ? audio.assetId.trim() : '';
  const rawValue = typeof audio.value === 'string' ? audio.value.trim() : '';
  const phraseId = typeof audio.phraseId === 'string' ? audio.phraseId.trim() : '';
  const phraseText = typeof audio.phraseText === 'string' ? audio.phraseText.trim() : '';
  const label = typeof audio.label === 'string' ? audio.label.trim() : '';
  const notes = typeof audio.notes === 'string' ? audio.notes.trim() : '';

  if (!source && !assetId && !rawValue && !phraseId && !phraseText && !label && !notes) return null;

  return {
    ...(source ? { source } : {}),
    ...(assetId ? { assetId } : {}),
    ...(rawValue ? { value: rawValue } : {}),
    ...(phraseId ? { phraseId } : {}),
    ...(phraseText ? { phraseText } : {}),
    ...(label ? { label } : {}),
    ...(notes ? { notes } : {}),
  } satisfies LessonAudioReference;
}

function serializeAudioAssetRef(value: unknown) {
  const audio = normalizeAudioReference(value);
  if (!audio) return '';
  return audio.value ?? (audio.assetId ? `asset:${audio.assetId}` : '');
}

export function countNonEmptyLines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).length;
}

export function parseChoiceLineDrafts(choiceLines: string): ChoiceLineDraft[] {
  return parseAuthoringLines(choiceLines).map((line, index) => {
    const [idRaw, labelRaw, correctnessRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
    return {
      id: idRaw || `choice-${index + 1}`,
      label: labelRaw || '',
      correctness: correctnessRaw || 'wrong',
      mediaKind: mediaKindRaw ? normalizeAssetKind(mediaKindRaw) : '',
      mediaValue: mediaValueRaw || '',
    };
  });
}

export function parseActivityChoices(choiceLines: string) {
  return parseChoiceLineDrafts(choiceLines).map((choice) => ({
    id: choice.id,
    label: choice.label || choice.id,
    isCorrect: ['correct', 'true', 'yes', '1'].includes(choice.correctness.toLowerCase()),
    ...(choice.mediaKind && choice.mediaValue ? { media: { kind: choice.mediaKind, value: parseDelimitedValue(choice.mediaValue) } } : {}),
  }));
}

export function parseDragItemLineDrafts(choiceLines: string): DragItemLineDraft[] {
  return parseAuthoringLines(choiceLines).map((line, index) => {
    const [idRaw, labelRaw, targetIdRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
    return {
      id: idRaw || `item-${index + 1}`,
      label: labelRaw || '',
      targetId: targetIdRaw || '',
      mediaKind: mediaKindRaw ? normalizeAssetKind(mediaKindRaw) : '',
      mediaValue: mediaValueRaw || '',
    };
  });
}

export function parseActivityDragItems(choiceLines: string): LessonActivityDragItem[] {
  return parseDragItemLineDrafts(choiceLines).map((item) => ({
    id: item.id,
    label: item.label || item.id,
    targetId: item.targetId,
    ...(item.mediaKind && item.mediaValue ? { media: { kind: item.mediaKind, value: parseDelimitedValue(item.mediaValue) } } : {}),
  } satisfies LessonActivityDragItem));
}

export function parseDragTargetLineDrafts(mediaLines: string): DragTargetLineDraft[] {
  return parseAuthoringLines(mediaLines).map((line, index) => {
    const [idRaw, promptRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
    return {
      id: idRaw || `target-${index + 1}`,
      prompt: promptRaw || '',
      mediaKind: mediaKindRaw ? normalizeAssetKind(mediaKindRaw) : '',
      mediaValue: mediaValueRaw || '',
    };
  });
}

export function parseActivityDragTargets(mediaLines: string): LessonActivityDragTarget[] {
  return parseDragTargetLineDrafts(mediaLines).map((target) => ({
    id: target.id,
    prompt: target.prompt || target.id,
    ...(target.mediaKind && target.mediaValue ? { media: { kind: target.mediaKind, value: parseDelimitedValue(target.mediaValue) } } : {}),
  } satisfies LessonActivityDragTarget));
}

export function parseMediaLineDrafts(mediaLines: string): MediaLineDraft[] {
  return parseAuthoringLines(mediaLines).map((line) => {
    const [kindRaw, valueRaw] = line.split('|').map((part) => part.trim());
    return {
      kind: normalizeAssetKind(kindRaw || 'image'),
      value: valueRaw || '',
    };
  });
}

export function parseActivityMedia(mediaLines: string) {
  return parseMediaLineDrafts(mediaLines).map((item) => ({
    kind: item.kind,
    value: parseDelimitedValue(item.value),
  }));
}

export function serializeChoiceLinesFromStep(step: LessonActivityStep) {
  if (step.type === 'drag_to_match') {
    return asArray<{ id?: string; label?: string; targetId?: string; media?: LessonActivityMedia | null }>(step.dragItems).map((item, itemIndex) => {
      const media = serializeInlineMedia(item?.media);
      const mediaKind = media.kind ? `|${media.kind}` : '';
      const mediaValue = media.value ? `|${media.value}` : '';
      return `${item.id || `item-${itemIndex + 1}`}|${item.label || ''}|${item.targetId || ''}${mediaKind}${mediaValue}`;
    }).join('\n');
  }

  return asArray<{ id?: string; label?: string; isCorrect?: boolean; media?: LessonActivityMedia | null }>(step.choices).map((choice, choiceIndex) => {
    const media = serializeInlineMedia(choice?.media);
    const mediaKind = media.kind ? `|${media.kind}` : '';
    const mediaValue = media.value ? `|${media.value}` : '';
    return `${choice.id || `choice-${choiceIndex + 1}`}|${choice.label || ''}|${choice.isCorrect ? 'correct' : 'wrong'}${mediaKind}${mediaValue}`;
  }).join('\n');
}

export function serializeMediaLinesFromStep(step: LessonActivityStep) {
  if (step.type === 'drag_to_match') {
    return asArray<{ id?: string; prompt?: string; media?: LessonActivityMedia | null }>(step.dragTargets).map((target, targetIndex) => {
      const media = serializeInlineMedia(target?.media);
      const mediaKind = media.kind ? `|${media.kind}` : '';
      const mediaValue = media.value ? `|${media.value}` : '';
      return `${target.id || `target-${targetIndex + 1}`}|${target.prompt || ''}${mediaKind}${mediaValue}`;
    }).join('\n');
  }

  return asArray<{ kind?: string; value?: string | string[] | null }>(step.media).map((item) => `${item.kind || 'image'}|${serializeMediaValue(item.value)}`).join('\n');
}

export function buildActivityDraftFromStep(step: LessonActivityStep, index: number): LessonActivityDraft {
  const supportAudioMode: LessonActivityDraft['supportAudioMode'] = step.supportAudio?.source === 'phrase-bank'
    ? 'phrase-bank'
    : step.supportAudio?.source === 'asset'
      ? 'asset'
      : 'none';

  return {
    id: step.id || `activity-${index + 1}`,
    title: step.title ?? step.prompt ?? `Activity ${index + 1}`,
    prompt: step.prompt ?? step.title ?? `Activity ${index + 1}`,
    type: step.type ?? 'speak_answer',
    durationMinutes: String(step.durationMinutes ?? 2),
    detail: step.detail ?? '',
    evidence: step.evidence ?? '',
    targetText: step.targetText ?? '',
    supportText: step.supportText ?? '',
    targetAudioAssetRef: serializeAudioAssetRef(step.targetAudio),
    supportAudioMode,
    supportAudioAssetRef: step.supportAudio?.source === 'asset' ? serializeAudioAssetRef(step.supportAudio) : '',
    supportAudioPhraseId: step.supportAudio?.source === 'phrase-bank' ? String(step.supportAudio.phraseId ?? '') : '',
    supportAudioPhraseText: step.supportAudio?.source === 'phrase-bank' ? String(step.supportAudio.phraseText ?? '') : '',
    expectedAnswers: asArray<string>(step.expectedAnswers).join(', '),
    tags: asArray<string>(step.tags).join(', '),
    facilitatorNotes: asArray<string>(step.facilitatorNotes).join('\n'),
    choiceLines: serializeChoiceLinesFromStep(step),
    mediaLines: serializeMediaLinesFromStep(step),
  } satisfies LessonActivityDraft;
}

export function buildActivityDraftsFromLesson(lesson?: Lesson | null): LessonActivityDraft[] {
  const source = asArray<LessonActivityStep>(lesson?.activitySteps ?? lesson?.activities);
  if (!source.length) return [];

  return source.map((step, index) => buildActivityDraftFromStep(step, index));
}

export function buildActivityStepFromDraft(draft: LessonActivityDraft, index: number): LessonActivityStep {
  const targetAudioValue = String(draft.targetAudioAssetRef ?? '').trim();
  const supportAudioMode = draft.supportAudioMode === 'phrase-bank' ? 'phrase-bank' : draft.supportAudioMode === 'asset' ? 'asset' : 'none';
  const supportAudioAssetRef = String(draft.supportAudioAssetRef ?? '').trim();
  const supportAudioPhraseId = String(draft.supportAudioPhraseId ?? '').trim();
  const supportAudioPhraseText = String(draft.supportAudioPhraseText ?? '').trim();

  return {
    id: draft.id || `activity-${index + 1}`,
    order: index + 1,
    type: draft.type,
    title: draft.title,
    prompt: draft.prompt || draft.title,
    durationMinutes: Number(draft.durationMinutes) || 0,
    detail: draft.detail,
    evidence: draft.evidence,
    targetText: String(draft.targetText ?? '').trim() || undefined,
    supportText: String(draft.supportText ?? '').trim() || undefined,
    targetAudio: targetAudioValue ? { source: 'asset', value: targetAudioValue } : undefined,
    supportAudio: supportAudioMode === 'asset'
      ? (supportAudioAssetRef ? { source: 'asset', value: supportAudioAssetRef } : undefined)
      : supportAudioMode === 'phrase-bank'
        ? ((supportAudioPhraseId || supportAudioPhraseText)
          ? {
              source: 'phrase-bank',
              ...(supportAudioPhraseId ? { phraseId: supportAudioPhraseId } : {}),
              ...(supportAudioPhraseText ? { phraseText: supportAudioPhraseText } : {}),
            }
          : undefined)
        : undefined,
    expectedAnswers: draft.expectedAnswers.split(',').map((item) => item.trim()).filter(Boolean),
    tags: draft.tags.split(',').map((item) => item.trim()).filter(Boolean),
    facilitatorNotes: draft.facilitatorNotes.split('\n').map((item) => item.trim()).filter(Boolean),
    choices: draft.type === 'drag_to_match' ? [] : parseActivityChoices(draft.choiceLines),
    media: draft.type === 'drag_to_match' ? [] : parseActivityMedia(draft.mediaLines),
    dragItems: draft.type === 'drag_to_match' ? parseActivityDragItems(draft.choiceLines) : undefined,
    dragTargets: draft.type === 'drag_to_match' ? parseActivityDragTargets(draft.mediaLines) : undefined,
  };
}

export function buildActivityStepsFromDrafts(drafts: LessonActivityDraft[]) {
  return drafts.map((draft, index) => buildActivityStepFromDraft(draft, index));
}

function countInlineMatches(value: string, needle: string) {
  const normalizedNeedle = needle.toLowerCase();
  return value
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.includes(`|${normalizedNeedle}|`) || line.startsWith(`${normalizedNeedle}|`))
    .length;
}

function countStructuredMedia(items: Array<{ kind?: string | null; media?: { kind?: string | null } | null }> | undefined, needle: string) {
  return (items ?? []).filter((item) => {
    const directKind = String(item.kind ?? '').toLowerCase();
    const nestedKind = String(item.media?.kind ?? '').toLowerCase();
    return directKind === needle || nestedKind === needle;
  }).length;
}

function getAssetIntentStatus(type: string, choiceCount: number, mediaCount: number, imageCount: number, audioCount: number) {
  switch (type) {
    case 'image_choice':
      if (choiceCount < 2) return { tone: 'warn', label: 'Choice logic incomplete', detail: 'Add at least two options before this looks like a real image task.' } as const;
      if (imageCount === 0) return { tone: 'warn', label: 'Image intent missing', detail: 'This step promises visual selection but has no image-linked asset in options or shared media.' } as const;
      return { tone: 'good', label: 'Image intent mapped', detail: 'Preview should render with explicit visual choices instead of text pretending to be pictures.' } as const;
    case 'listen_repeat':
    case 'listen_answer':
      if (audioCount === 0 && mediaCount === 0) return { tone: 'warn', label: 'Listening cue thin', detail: 'Add an audio/script asset or shared media cue so the listening intent is not guesswork.' } as const;
      return { tone: 'good', label: 'Listening cue mapped', detail: 'This step has a visible listening asset path for preview and delivery.' } as const;
    case 'word_build':
      if (choiceCount === 0 && mediaCount === 0) return { tone: 'warn', label: 'Build pieces missing', detail: 'Add tiles, chunks, or media cues so the learner has something to assemble.' } as const;
      return { tone: 'good', label: 'Build support mapped', detail: 'The step includes build pieces or support media the preview can hint at.' } as const;
    case 'tap_choice':
      if (choiceCount < 2) return { tone: 'warn', label: 'Tap targets thin', detail: 'Add multiple tap targets so this is an interaction, not a single dead-end button.' } as const;
      return { tone: 'good', label: 'Tap targets mapped', detail: 'Tap options are present and the preview can signal a real selection task.' } as const;
    case 'drag_to_match':
      if (choiceCount < 2) return { tone: 'warn', label: 'Drag cards thin', detail: 'Add multiple draggable cards so learners actually have something to sort.' } as const;
      if (mediaCount < 2) return { tone: 'warn', label: 'Drop zones thin', detail: 'Add at least two target zones so the matching activity has real destinations.' } as const;
      return { tone: 'good', label: 'Drag match mapped', detail: 'The step includes draggable cards and target zones the learner can match.' } as const;
    case 'letter_intro':
      if (mediaCount === 0) return { tone: 'warn', label: 'Letter support thin', detail: 'Add a trace card, image, or audio cue so the intro is more than plain text.' } as const;
      return { tone: 'good', label: 'Letter support mapped', detail: 'Preview can hint at the anchor card or cue attached to this letter step.' } as const;
    default:
      if (choiceCount > 0 || mediaCount > 0) return { tone: 'good', label: 'Assets attached', detail: 'This step already carries structured choices or media cues.' } as const;
      return { tone: 'neutral', label: 'Text-led step', detail: 'No structured asset payload yet — that is fine if the interaction is intentionally verbal.' } as const;
  }
}

export function getDraftAssetIntentSummary(activity: ActivityDraftLike) {
  const choiceCount = countNonEmptyLines(activity.choiceLines);
  const mediaCount = countNonEmptyLines(activity.mediaLines);
  const imageCount = countInlineMatches(activity.choiceLines, 'image') + countInlineMatches(activity.mediaLines, 'image');
  const audioCount = countInlineMatches(activity.choiceLines, 'audio') + countInlineMatches(activity.mediaLines, 'audio');
  const kindMentions = [activity.choiceLines, activity.mediaLines]
    .flatMap((value) => value.split('\n'))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim());
      return parts.length >= 5 ? parts[3] : parts[0];
    })
    .filter(Boolean);
  const unknownKinds = Array.from(new Set(kindMentions.map((kind) => normalizeAssetKind(kind)).filter((kind) => !isKnownAssetKind(kind))));
  const base = getAssetIntentStatus(activity.type, choiceCount, mediaCount, imageCount, audioCount);
  return {
    ...base,
    assetKinds: Array.from(new Set(kindMentions.map((kind) => getAssetKindLabel(kind)))),
    unknownKinds,
    detail: unknownKinds.length ? `${base.detail} Non-standard kinds: ${unknownKinds.map((kind) => getAssetKindLabel(kind)).join(', ')}.` : base.detail,
  };
}

export function getPreviewAssetSummary(step: LessonActivityStep) {
  const choiceCount = step.type === 'drag_to_match' ? (step.dragItems?.length ?? 0) : (step.choices?.length ?? 0);
  const mediaCount = step.type === 'drag_to_match' ? (step.dragTargets?.length ?? 0) : (step.media?.length ?? 0);
  const imageCount = countStructuredMedia(step.media, 'image')
    + countStructuredMedia(step.choices, 'image')
    + countStructuredMedia(step.dragItems, 'image')
    + countStructuredMedia(step.dragTargets, 'image');
  const audioCount = countStructuredMedia(step.media, 'audio')
    + countStructuredMedia(step.choices, 'audio')
    + countStructuredMedia(step.dragItems, 'audio')
    + countStructuredMedia(step.dragTargets, 'audio');
  const assetKinds = [
    ...(step.media ?? []).map((item) => item.kind),
    ...(step.choices ?? []).map((item) => item.media?.kind),
    ...(step.dragItems ?? []).map((item) => item.media?.kind),
    ...(step.dragTargets ?? []).map((item) => item.media?.kind),
  ].filter(Boolean).map((kind) => normalizeAssetKind(kind));
  const unknownKinds = Array.from(new Set(assetKinds.filter((kind) => !isKnownAssetKind(kind))));
  const labels = Array.from(new Set(assetKinds.map((kind) => getAssetKindLabel(kind))));
  const missingValues = [
    ...(step.media ?? []).filter((item) => Array.isArray(item.value) ? item.value.length === 0 : !String(item.value ?? '').trim()),
    ...(step.choices ?? []).filter((item) => item.media && (Array.isArray(item.media.value) ? item.media.value.length === 0 : !String(item.media.value ?? '').trim())),
    ...(step.dragItems ?? []).filter((item) => item.media && (Array.isArray(item.media.value) ? item.media.value.length === 0 : !String(item.media.value ?? '').trim())),
    ...(step.dragTargets ?? []).filter((item) => item.media && (Array.isArray(item.media.value) ? item.media.value.length === 0 : !String(item.media.value ?? '').trim())),
  ].length;
  const totalAssetEntries = assetKinds.length;
  const base = getAssetIntentStatus(step.type, choiceCount, mediaCount, imageCount, audioCount);
  const hint = missingValues > 0
    ? `${missingValues} asset ${missingValues === 1 ? 'entry is' : 'entries are'} missing a value.`
    : unknownKinds.length
      ? `Preview uses non-standard asset kinds: ${unknownKinds.map((kind) => getAssetKindLabel(kind)).join(', ')}.`
      : base.detail;
  return {
    ...base,
    assetKinds: labels,
    unknownKinds,
    missingValues,
    totalAssetEntries,
    isMediaBacked: totalAssetEntries > 0 && missingValues === 0,
    readinessLabel: totalAssetEntries > 0 ? (missingValues === 0 ? 'Media-backed' : 'Media incomplete') : 'Text-only',
    assetFootprint: totalAssetEntries > 0 ? `${totalAssetEntries} asset ${totalAssetEntries === 1 ? 'link' : 'links'}` : 'No linked assets',
    detail: hint,
  };
}
