import type { LessonActivityChoice, LessonActivityMedia, LessonActivityStep } from './types';

export const knownLessonAssetKinds = [
  'image',
  'audio',
  'illustration',
  'prompt-card',
  'story-card',
  'trace-card',
  'letter-card',
  'tile',
  'word-card',
  'hint',
  'transcript',
] as const;

export type LessonAssetKind = (typeof knownLessonAssetKinds)[number];

export function normalizeLessonAssetKind(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || 'image';
}

export function getLessonAssetKindLabel(kind: string | null | undefined) {
  const normalized = normalizeLessonAssetKind(kind);
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

export function isKnownLessonAssetKind(kind: string | null | undefined) {
  return knownLessonAssetKinds.includes(normalizeLessonAssetKind(kind) as LessonAssetKind);
}

export function parseDelimitedAssetValue(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.includes(',') ? trimmed.split(',').map((item) => item.trim()).filter(Boolean) : trimmed;
}

export function getLessonAssetValues(value: LessonActivityMedia['value']) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  const normalized = String(value ?? '').trim();
  return normalized ? [normalized] : [];
}

export function getLessonAssetPreviewTone(kind: string | null | undefined) {
  switch (normalizeLessonAssetKind(kind)) {
    case 'audio':
      return { bg: '#EEF2FF', border: '#C7D2FE', text: '#3730A3', accent: '#4F46E5' };
    case 'hint':
    case 'transcript':
      return { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412', accent: '#EA580C' };
    case 'letter-card':
    case 'trace-card':
    case 'tile':
    case 'word-card':
      return { bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9', accent: '#7C3AED' };
    case 'story-card':
    case 'prompt-card':
      return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', accent: '#2563EB' };
    default:
      return { bg: '#ECFDF5', border: '#BBF7D0', text: '#166534', accent: '#059669' };
  }
}

export function getLessonAssetRuntimeReadiness(kind: string | null | undefined, value: LessonActivityMedia['value']) {
  const normalized = normalizeLessonAssetKind(kind);
  const values = getLessonAssetValues(value);
  const hasValue = values.length > 0;

  if (!hasValue) {
    return {
      ready: false,
      label: 'Missing asset value',
      detail: `${getLessonAssetKindLabel(normalized)} will not render in learner runtime until it has a real value.`,
    };
  }

  switch (normalized) {
    case 'audio':
      return {
        ready: true,
        label: 'Learner hears playback',
        detail: `Runtime will expose ${values.length > 1 ? 'an audio set' : 'an audio cue'} for playback in the learner app.`,
      };
    case 'image':
    case 'illustration':
      return {
        ready: true,
        label: 'Learner sees artwork',
        detail: `Runtime will render ${values.length > 1 ? 'image variants' : 'an image card'} for this step.`,
      };
    case 'prompt-card':
    case 'story-card':
      return {
        ready: true,
        label: 'Learner sees a text card',
        detail: 'Runtime will show this as a prompt/story card, not hide it behind a generic asset badge.',
      };
    case 'trace-card':
      return {
        ready: true,
        label: 'Learner sees a tracing card',
        detail: 'Runtime will surface this as tracing support so the activity still looks like handwriting practice.',
      };
    case 'letter-card':
      return {
        ready: true,
        label: 'Learner sees the letter focus',
        detail: 'Runtime will treat this as the visible letter anchor for the step.',
      };
    case 'tile':
    case 'word-card':
      return {
        ready: true,
        label: 'Learner sees build pieces',
        detail: 'Runtime will show this as a buildable or readable card rather than plain body text.',
      };
    case 'hint':
      return {
        ready: true,
        label: 'Learner/facilitator sees a hint',
        detail: 'Runtime will show the hint as support text when the step opens.',
      };
    case 'transcript':
      return {
        ready: true,
        label: 'Learner sees script text',
        detail: 'Runtime will show the transcript/script text as a visible reading or listening cue.',
      };
    default:
      return {
        ready: true,
        label: 'Custom asset attached',
        detail: 'Runtime will keep the asset visible, but verify the learner app understands this custom kind the way you expect.',
      };
  }
}

export function buildLessonAssetPreviewItems(step: Pick<LessonActivityStep, 'media' | 'choices'>) {
  const shared = (Array.isArray(step.media) ? step.media : []).map((media, index) => ({
    scope: 'shared' as const,
    key: `shared-${index}`,
    label: `Shared ${getLessonAssetKindLabel(media.kind)}`,
    kind: normalizeLessonAssetKind(media.kind),
    values: getLessonAssetValues(media.value),
    choiceLabel: null as string | null,
  }));

  const choices = (Array.isArray(step.choices) ? step.choices : [])
    .filter((choice) => choice.media)
    .map((choice, index) => ({
      scope: 'choice' as const,
      key: `choice-${choice.id || index}`,
      label: choice.label || `Choice ${index + 1}`,
      kind: normalizeLessonAssetKind(choice.media?.kind),
      values: getLessonAssetValues(choice.media?.value),
      choiceLabel: choice.label || null,
    }));

  return [...shared, ...choices].map((item) => ({
    ...item,
    tone: getLessonAssetPreviewTone(item.kind),
    readiness: getLessonAssetRuntimeReadiness(item.kind, item.values),
    previewValue: item.values[0] ?? '',
  }));
}

export function parseActivityChoices(choiceLines: string): LessonActivityChoice[] {
  return choiceLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [idRaw, labelRaw, correctnessRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
      const id = idRaw || `choice-${index + 1}`;
      const label = labelRaw || id;
      const isCorrect = ['correct', 'true', 'yes', '1'].includes((correctnessRaw || '').toLowerCase());
      const mediaKind = normalizeLessonAssetKind(mediaKindRaw || '');
      const mediaValue = mediaValueRaw || '';
      return {
        id,
        label,
        isCorrect,
        ...(mediaValue ? { media: { kind: mediaKind, value: parseDelimitedAssetValue(mediaValue) } } : {}),
      };
    });
}

export function parseActivityMedia(mediaLines: string): LessonActivityMedia[] {
  return mediaLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kindRaw, valueRaw] = line.split('|').map((part) => part.trim());
      const kind = normalizeLessonAssetKind(kindRaw || 'image');
      const value = valueRaw || '';
      return {
        kind,
        value: parseDelimitedAssetValue(value),
      };
    });
}

export function summarizeLessonAssets(step: Pick<LessonActivityStep, 'choices' | 'media'>) {
  const assets = [
    ...(Array.isArray(step.media) ? step.media : []),
    ...(Array.isArray(step.choices) ? step.choices.map((choice) => choice.media).filter(Boolean) as LessonActivityMedia[] : []),
  ];

  const counts = new Map<string, number>();
  let missingValueCount = 0;
  let unknownKindCount = 0;

  for (const asset of assets) {
    const kind = normalizeLessonAssetKind(asset?.kind);
    const value = asset?.value;
    const hasValue = Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    if (!hasValue) missingValueCount += 1;
    if (!isKnownLessonAssetKind(kind)) unknownKindCount += 1;
  }

  const labels = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([kind, count]) => `${count} ${getLessonAssetKindLabel(kind)}`);

  return {
    total: assets.length,
    labels,
    missingValueCount,
    unknownKindCount,
    hasAudio: (counts.get('audio') ?? 0) > 0,
    hasVisual: ['image', 'illustration', 'prompt-card', 'story-card', 'trace-card', 'letter-card', 'tile', 'word-card'].some((kind) => (counts.get(kind) ?? 0) > 0),
  };
}

export function getStepRuntimePreviewHints(step: Pick<LessonActivityStep, 'type' | 'choices' | 'media' | 'prompt' | 'detail' | 'expectedAnswers' | 'evidence'>) {
  const assetSummary = summarizeLessonAssets(step);
  const previewItems = buildLessonAssetPreviewItems(step);
  const hints: string[] = [];

  if (assetSummary.total === 0) hints.push('No learner-facing assets attached yet.');
  if (assetSummary.missingValueCount > 0) hints.push(`${assetSummary.missingValueCount} asset ${assetSummary.missingValueCount === 1 ? 'entry is' : 'entries are'} missing a value.`);
  if (assetSummary.unknownKindCount > 0) hints.push(`${assetSummary.unknownKindCount} asset ${assetSummary.unknownKindCount === 1 ? 'uses' : 'use'} a non-standard kind.`);

  switch (step.type) {
    case 'listen_repeat':
    case 'listen_answer':
      if (!assetSummary.hasAudio) hints.push('Add audio or a listening asset so runtime playback is obvious.');
      break;
    case 'image_choice':
      if (!assetSummary.hasVisual) hints.push('Image choice needs visible option art or a shared visual cue.');
      break;
    case 'letter_intro':
      if (!assetSummary.hasVisual) hints.push('Letter intro lands better with a trace/letter card asset.');
      break;
    default:
      break;
  }

  if (!String(step.evidence ?? '').trim()) hints.push('Evidence rule is still blank.');
  if (!Array.isArray(step.expectedAnswers) || step.expectedAnswers.length === 0) hints.push('Expected answers are still empty.');

  const readyAssetCount = previewItems.filter((item) => item.readiness.ready).length;
  const readyLabel = previewItems.length === 0
    ? 'Preview is text-led only'
    : readyAssetCount === previewItems.length && hints.length === 0
      ? 'Preview looks learner-ready'
      : readyAssetCount > 0
        ? `${readyAssetCount}/${previewItems.length} asset cards look runtime-ready`
        : 'Preview still needs runtime polish';

  return { assetSummary, previewItems, hints, readyAssetCount, readyLabel };
}
