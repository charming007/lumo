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

  return { assetSummary, hints };
}
