import type { LessonActivityStep } from '../lib/types';
import type { ActivityDraftLike } from './lesson-step-authoring';

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

export function countNonEmptyLines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).length;
}

export function parseActivityChoices(choiceLines: string) {
  return choiceLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [idRaw, labelRaw, correctnessRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
      const id = idRaw || `choice-${index + 1}`;
      const label = labelRaw || id;
      const isCorrect = ['correct', 'true', 'yes', '1'].includes((correctnessRaw || '').toLowerCase());
      const mediaKind = mediaKindRaw ? normalizeAssetKind(mediaKindRaw) : '';
      const mediaValue = mediaValueRaw || '';
      return {
        id,
        label,
        isCorrect,
        ...(mediaKind && mediaValue ? { media: { kind: mediaKind, value: parseDelimitedValue(mediaValue) } } : {}),
      };
    });
}

export function parseActivityMedia(mediaLines: string) {
  return mediaLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kindRaw, valueRaw] = line.split('|').map((part) => part.trim());
      const kind = normalizeAssetKind(kindRaw || 'image');
      const value = valueRaw || '';
      return {
        kind,
        value: parseDelimitedValue(value),
      };
    });
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
  const choiceCount = step.choices?.length ?? 0;
  const mediaCount = step.media?.length ?? 0;
  const imageCount = countStructuredMedia(step.media, 'image') + countStructuredMedia(step.choices, 'image');
  const audioCount = countStructuredMedia(step.media, 'audio') + countStructuredMedia(step.choices, 'audio');
  const assetKinds = [
    ...(step.media ?? []).map((item) => item.kind),
    ...(step.choices ?? []).map((item) => item.media?.kind),
  ].filter(Boolean).map((kind) => normalizeAssetKind(kind));
  const unknownKinds = Array.from(new Set(assetKinds.filter((kind) => !isKnownAssetKind(kind))));
  const labels = Array.from(new Set(assetKinds.map((kind) => getAssetKindLabel(kind))));
  const missingValues = [
    ...(step.media ?? []).filter((item) => Array.isArray(item.value) ? item.value.length === 0 : !String(item.value ?? '').trim()),
    ...(step.choices ?? []).filter((item) => item.media && (Array.isArray(item.media.value) ? item.media.value.length === 0 : !String(item.media.value ?? '').trim())),
  ].length;
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
    detail: hint,
  };
}
