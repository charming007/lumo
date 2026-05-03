import type { LessonActivityChoice, LessonActivityMedia, LessonActivityStep, LessonAsset } from './types';

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

function findRegistryAsset(assets: LessonAsset[], value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return assets.find((asset) => {
    const aliases = [
      asset.id,
      `asset:${asset.id}`,
      asset.storagePath,
      asset.fileUrl,
      asset.fileName,
      asset.originalFileName,
    ].filter(Boolean);
    return aliases.includes(trimmed);
  }) ?? null;
}

function getRegistryBackedReadinessDetail(assets: LessonAsset[] | undefined, values: string[]) {
  if (!assets?.length || values.length === 0) return null;

  const matched = values.map((value) => findRegistryAsset(assets, value)).filter(Boolean) as LessonAsset[];
  if (matched.length === 0) {
    return {
      ready: false,
      label: 'Registry match missing',
      detail: 'Reference is filled, but it does not resolve to a known asset registry row yet. Publish should wait until asset ops can see it.',
      issue: 'missing',
    };
  }

  const brokenManaged = matched.find((asset) => asset.storagePath && !asset.fileUrl);
  if (brokenManaged) {
    return {
      ready: false,
      label: 'Managed file not publicly resolvable',
      detail: `${brokenManaged.title || brokenManaged.id} is registered, but its managed file/link is not healthy enough to trust in the live runtime.`,
      issue: 'broken',
    };
  }

  const archived = matched.find((asset) => asset.status === 'archived');
  if (archived) {
    return {
      ready: false,
      label: 'Archived asset linked',
      detail: `${archived.title || archived.id} is archived, so this lesson is leaning on media that ops already retired.`,
      issue: 'archived',
    };
  }

  const canonicalMatches = matched.filter((asset) => values.some((value) => value.trim() === `asset:${asset.id}`));
  const preferred = canonicalMatches[0] ?? matched[0];
  return {
    ready: true,
    label: canonicalMatches.length > 0 ? 'Registry-backed asset' : 'Legacy asset alias',
    detail: canonicalMatches.length > 0
      ? `${preferred.title || preferred.id} resolves through the live asset registry.`
      : `${preferred.title || preferred.id} resolves in the registry, but migrate this value to asset:${preferred.id} for cleaner runtime confidence.`,
    issue: canonicalMatches.length > 0 ? null : 'legacy',
  };
}

export function getLessonAssetRuntimeReadiness(kind: string | null | undefined, value: LessonActivityMedia['value'], assets?: LessonAsset[]) {
  const normalized = normalizeLessonAssetKind(kind);
  const values = getLessonAssetValues(value);
  const hasValue = values.length > 0;

  if (!hasValue) {
    return {
      ready: false,
      label: 'Missing asset value',
      detail: `${getLessonAssetKindLabel(normalized)} will not render in learner runtime until it has a real value.`,
      issue: 'missing-value',
    };
  }

  const registryReadiness = getRegistryBackedReadinessDetail(assets, values);

  switch (normalized) {
    case 'audio':
      return {
        ready: registryReadiness?.ready ?? true,
        label: registryReadiness?.label ?? 'Learner hears playback',
        detail: registryReadiness?.detail ?? `Runtime will expose ${values.length > 1 ? 'an audio set' : 'an audio cue'} for playback in the learner app.`,
        issue: registryReadiness?.issue ?? null,
      };
    case 'image':
    case 'illustration':
      return {
        ready: registryReadiness?.ready ?? true,
        label: registryReadiness?.label ?? 'Learner sees artwork',
        detail: registryReadiness?.detail ?? `Runtime will render ${values.length > 1 ? 'image variants' : 'an image card'} for this step.`,
        issue: registryReadiness?.issue ?? null,
      };
    case 'prompt-card':
    case 'story-card':
      return {
        ready: registryReadiness?.ready ?? true,
        label: registryReadiness?.label ?? 'Learner sees a text card',
        detail: registryReadiness?.detail ?? 'Runtime will show this as a prompt/story card, not hide it behind a generic asset badge.',
        issue: registryReadiness?.issue ?? null,
      };
    case 'trace-card':
      return {
        ready: registryReadiness?.ready ?? true,
        label: registryReadiness?.label ?? 'Learner sees a tracing card',
        detail: registryReadiness?.detail ?? 'Runtime will surface this as tracing support so the activity still looks like handwriting practice.',
        issue: registryReadiness?.issue ?? null,
      };
    case 'letter-card':
      return {
        ready: registryReadiness?.ready ?? true,
        label: registryReadiness?.label ?? 'Learner sees the letter focus',
        detail: registryReadiness?.detail ?? 'Runtime will treat this as the visible letter anchor for the step.',
        issue: registryReadiness?.issue ?? null,
      };
    case 'tile':
    case 'word-card':
      return {
        ready: registryReadiness?.ready ?? true,
        label: registryReadiness?.label ?? 'Learner sees build pieces',
        detail: registryReadiness?.detail ?? 'Runtime will show this as a buildable or readable card rather than plain body text.',
        issue: registryReadiness?.issue ?? null,
      };
    case 'hint':
      return {
        ready: registryReadiness?.ready ?? true,
        label: registryReadiness?.label ?? 'Learner/facilitator sees a hint',
        detail: registryReadiness?.detail ?? 'Runtime will show the hint as support text when the step opens.',
        issue: registryReadiness?.issue ?? null,
      };
    case 'transcript':
      return {
        ready: registryReadiness?.ready ?? true,
        label: registryReadiness?.label ?? 'Learner sees script text',
        detail: registryReadiness?.detail ?? 'Runtime will show the transcript/script text as a visible reading or listening cue.',
        issue: registryReadiness?.issue ?? null,
      };
    default:
      return {
        ready: registryReadiness?.ready ?? true,
        label: registryReadiness?.label ?? 'Custom asset attached',
        detail: registryReadiness?.detail ?? 'Runtime will keep the asset visible, but verify the learner app understands this custom kind the way you expect.',
        issue: registryReadiness?.issue ?? null,
      };
  }
}

export function buildLessonAssetPreviewItems(step: Pick<LessonActivityStep, 'media' | 'choices'>, assets?: LessonAsset[]) {
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
    readiness: getLessonAssetRuntimeReadiness(item.kind, item.values, assets),
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

export function getStepRuntimePreviewHints(step: Pick<LessonActivityStep, 'type' | 'choices' | 'media' | 'prompt' | 'detail' | 'expectedAnswers' | 'evidence'>, assets?: LessonAsset[]) {
  const assetSummary = summarizeLessonAssets(step);
  const previewItems = buildLessonAssetPreviewItems(step, assets);
  const hints: string[] = [];

  if (assetSummary.total === 0) hints.push('No learner-facing assets attached yet.');
  if (assetSummary.missingValueCount > 0) hints.push(`${assetSummary.missingValueCount} asset ${assetSummary.missingValueCount === 1 ? 'entry is' : 'entries are'} missing a value.`);
  if (assetSummary.unknownKindCount > 0) hints.push(`${assetSummary.unknownKindCount} asset ${assetSummary.unknownKindCount === 1 ? 'uses' : 'use'} a non-standard kind.`);

  const missingRegistryCount = previewItems.filter((item) => item.readiness.issue === 'missing').length;
  const brokenRegistryCount = previewItems.filter((item) => item.readiness.issue === 'broken').length;
  const archivedRegistryCount = previewItems.filter((item) => item.readiness.issue === 'archived').length;
  const legacyRegistryCount = previewItems.filter((item) => item.readiness.issue === 'legacy').length;

  if (missingRegistryCount > 0) hints.push(`${missingRegistryCount} asset ${missingRegistryCount === 1 ? 'reference does' : 'references do'} not resolve through the live asset registry yet.`);
  if (brokenRegistryCount > 0) hints.push(`${brokenRegistryCount} managed asset ${brokenRegistryCount === 1 ? 'file looks unhealthy' : 'files look unhealthy'} for live runtime delivery.`);
  if (archivedRegistryCount > 0) hints.push(`${archivedRegistryCount} asset ${archivedRegistryCount === 1 ? 'reference points' : 'references point'} at archived media.`);
  if (legacyRegistryCount > 0) hints.push(`${legacyRegistryCount} asset ${legacyRegistryCount === 1 ? 'reference still uses' : 'references still use'} a legacy URL/path alias instead of asset:<id>.`);

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
    case 'drag_to_match':
      if (!assetSummary.hasVisual) hints.push('Drag to match works better when cards or zones carry visible cues.');
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
