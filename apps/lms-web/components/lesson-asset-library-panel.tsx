'use client';

import { useMemo, useState } from 'react';
import { ModalLauncher } from './modal-launcher';
import { AssetPreview, AssetRuntimeLink } from './asset-preview';
import type { LessonActivityStep, LessonAsset } from '../lib/types';

type AssetTemplate = {
  id: string;
  label: string;
  kind: string;
  category: string;
  value: string;
  note: string;
  appliesTo: string[];
  target: 'media' | 'choice-media';
  choiceLabel?: string;
  choiceCorrect?: boolean;
};

const assetTemplates: AssetTemplate[] = [
  {
    id: 'template-listen-audio',
    label: 'Add listening audio cue',
    kind: 'audio',
    category: 'Listening cues',
    value: 'audio',
    note: 'Shared audio cue for listen-first steps.',
    appliesTo: ['listen_repeat', 'listen_answer', 'speak_answer'],
    target: 'media',
  },
  {
    id: 'template-letter-trace',
    label: 'Add trace card',
    kind: 'trace-card',
    category: 'Letter intro',
    value: 'trace-card',
    note: 'Trace support for letter introduction or sound demo.',
    appliesTo: ['letter_intro'],
    target: 'media',
  },
  {
    id: 'template-word-tiles',
    label: 'Add build tiles',
    kind: 'tile',
    category: 'Build pieces',
    value: 'tile',
    note: 'Starter tile set for build tasks.',
    appliesTo: ['word_build'],
    target: 'media',
  },
  {
    id: 'template-choice-image',
    label: 'Insert image option',
    kind: 'image',
    category: 'Choice options',
    value: 'image',
    note: 'Drop an image asset straight into the choice list.',
    appliesTo: ['image_choice', 'tap_choice'],
    target: 'choice-media',
    choiceLabel: 'Choice label',
    choiceCorrect: false,
  },
  {
    id: 'template-oral-prompt',
    label: 'Add oral check prompt card',
    kind: 'prompt-card',
    category: 'Assessment support',
    value: 'prompt-card',
    note: 'Shared support card for oral evidence steps.',
    appliesTo: ['oral_quiz', 'speak_answer'],
    target: 'media',
  },
];

function parseMediaLines(lines: string) {
  return lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kind, value] = line.split('|').map((part) => part.trim());
      return { kind: kind || 'image', value: value || '' };
    });
}

function parseChoiceLines(lines: string) {
  return lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [id, label, correctness, mediaKind, mediaValue] = line.split('|').map((part) => part.trim());
      return {
        id: id || `choice-${index + 1}`,
        label: label || '',
        correctness: correctness || 'wrong',
        mediaKind: mediaKind || '',
        mediaValue: mediaValue || '',
      };
    });
}

function toMediaLines(items: Array<{ kind: string; value: string }>) {
  return items.map((item) => `${item.kind}|${item.value}`).join('\n');
}

function toChoiceLines(items: Array<{ id: string; label: string; correctness: string; mediaKind: string; mediaValue: string }>) {
  return items.map((item) => [item.id, item.label, item.correctness, item.mediaKind, item.mediaValue].join('|')).join('\n');
}

function appendMediaLine(lines: string, asset: { kind: string; value: string }) {
  const parsed = parseMediaLines(lines);
  const alreadyExists = parsed.some((item) => item.kind === asset.kind && item.value === asset.value);
  if (alreadyExists) return lines;
  return toMediaLines([...parsed, asset]);
}

function appendChoiceMediaLine(
  lines: string,
  asset: { kind: string; value: string; label: string; isCorrect: boolean },
) {
  const parsed = parseChoiceLines(lines);
  const nextIndex = parsed.length + 1;
  const nextId = `choice-${nextIndex}`;
  const duplicate = parsed.some((item) => item.label.toLowerCase() === asset.label.toLowerCase() && item.mediaValue === asset.value);
  if (duplicate) return lines;
  return toChoiceLines([
    ...parsed,
    {
      id: nextId,
      label: asset.label,
      correctness: asset.isCorrect ? 'correct' : 'wrong',
      mediaKind: asset.kind,
      mediaValue: asset.value,
    },
  ]);
}


type DragItemLine = {
  id: string;
  label: string;
  targetId: string;
  mediaKind: string;
  mediaValue: string;
};

type DragTargetLine = {
  id: string;
  prompt: string;
  mediaKind: string;
  mediaValue: string;
};

function parseDragItemLines(lines: string): DragItemLine[] {
  return lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [id, label, targetId, mediaKind, mediaValue] = line.split('|').map((part) => part.trim());
      return {
        id: id || `item-${index + 1}`,
        label: label || '',
        targetId: targetId || '',
        mediaKind: mediaKind || '',
        mediaValue: mediaValue || '',
      };
    });
}

function parseDragTargetLines(lines: string): DragTargetLine[] {
  return lines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [id, prompt, mediaKind, mediaValue] = line.split('|').map((part) => part.trim());
      return {
        id: id || `target-${index + 1}`,
        prompt: prompt || '',
        mediaKind: mediaKind || '',
        mediaValue: mediaValue || '',
      };
    });
}

function toDragItemLines(items: DragItemLine[]) {
  return items.map((item) => [item.id, item.label, item.targetId, item.mediaKind, item.mediaValue].join('|')).join('\n');
}

function toDragTargetLines(items: DragTargetLine[]) {
  return items.map((item) => [item.id, item.prompt, item.mediaKind, item.mediaValue].join('|')).join('\n');
}

function slugifyAssetSeed(value: string, fallback: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function appendDragItemLine(
  lines: string,
  asset: { kind: string; value: string; label: string },
) {
  const parsed = parseDragItemLines(lines);
  const duplicate = parsed.some((item) => item.label.toLowerCase() === asset.label.toLowerCase() && item.mediaValue === asset.value);
  if (duplicate) return lines;
  const seed = slugifyAssetSeed(asset.label, `item-${parsed.length + 1}`);
  return toDragItemLines([
    ...parsed,
    {
      id: `item-${seed}`,
      label: asset.label,
      targetId: '',
      mediaKind: asset.kind,
      mediaValue: asset.value,
    },
  ]);
}

function appendDragTargetLine(
  lines: string,
  asset: { kind: string; value: string; prompt: string },
) {
  const parsed = parseDragTargetLines(lines);
  const duplicate = parsed.some((item) => item.prompt.toLowerCase() === asset.prompt.toLowerCase() && item.mediaValue === asset.value);
  if (duplicate) return lines;
  const seed = slugifyAssetSeed(asset.prompt, `target-${parsed.length + 1}`);
  return toDragTargetLines([
    ...parsed,
    {
      id: `target-${seed}` ,
      prompt: asset.prompt,
      mediaKind: asset.kind,
      mediaValue: asset.value,
    },
  ]);
}

function stepSupportsAssetKind(stepType: string, kind: string) {
  const normalizedKind = kind.toLowerCase();
  if (stepType === 'image_choice' || stepType === 'tap_choice' || stepType === 'drag_to_match') {
    return ['image', 'illustration', 'story-card', 'prompt-card', 'word-card', 'letter-card'].includes(normalizedKind);
  }
  if (stepType === 'listen_repeat' || stepType === 'listen_answer') {
    return ['audio', 'transcript', 'prompt-card', 'story-card', 'image', 'illustration'].includes(normalizedKind);
  }
  if (stepType === 'word_build') {
    return ['tile', 'word-card', 'letter-card', 'trace-card', 'image'].includes(normalizedKind);
  }
  if (stepType === 'letter_intro') {
    return ['trace-card', 'letter-card', 'audio', 'image', 'illustration', 'prompt-card'].includes(normalizedKind);
  }
  if (stepType === 'oral_quiz' || stepType === 'speak_answer') {
    return ['audio', 'prompt-card', 'story-card', 'image', 'illustration', 'transcript'].includes(normalizedKind);
  }
  return true;
}

function getPreferredAssetValue(asset: LessonAsset) {
  return asset.fileUrl ?? asset.storagePath ?? asset.fileName ?? asset.id;
}

function getScopeRank(asset: LessonAsset, lessonId?: string, moduleId?: string, subjectId?: string) {
  if (lessonId && asset.lessonId === lessonId) return 0;
  if (moduleId && asset.moduleId === moduleId) return 1;
  if (subjectId && asset.subjectId === subjectId) return 2;
  if (!asset.subjectId && !asset.moduleId && !asset.lessonId) return 3;
  return 4;
}

function buildChoiceLabel(asset: LessonAsset) {
  return asset.title.replace(/\s+(card|image|illustration|audio)$/i, '').trim() || asset.title;
}

function scopeLabelForAsset(asset: LessonAsset, scopeRank: number) {
  if (scopeRank === 0) return `Lesson · ${asset.lessonTitle ?? asset.title}`;
  if (scopeRank === 1) return `Module · ${asset.moduleTitle ?? 'Scoped asset'}`;
  if (scopeRank === 2) return `Subject · ${asset.subjectName ?? 'Scoped asset'}`;
  if (scopeRank === 3) return 'Shared library';
  return 'Other scope';
}

export function LessonAssetLibraryPanel({
  stepType,
  mediaLines,
  choiceLines,
  activitySteps,
  assets,
  subjectId,
  moduleId,
  lessonId,
  onMediaLinesChange,
  onChoiceLinesChange,
}: {
  stepType: string;
  mediaLines: string;
  choiceLines: string;
  activitySteps: LessonActivityStep[];
  assets: LessonAsset[];
  subjectId?: string;
  moduleId?: string;
  lessonId?: string;
  onMediaLinesChange: (value: string) => void;
  onChoiceLinesChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'scoped' | 'shared'>('all');
  const [kindFilter, setKindFilter] = useState('all');
  const normalizedQuery = query.trim().toLowerCase();

  const visibleAssets = useMemo(() => assets
    .filter((asset) => Boolean(getPreferredAssetValue(asset)))
    .filter((asset) => stepSupportsAssetKind(stepType, asset.kind))
    .filter((asset) => {
      const scopeRank = getScopeRank(asset, lessonId, moduleId, subjectId);
      if (scopeFilter === 'scoped') return scopeRank <= 2;
      if (scopeFilter === 'shared') return scopeRank === 3;
      return true;
    })
    .filter((asset) => kindFilter === 'all' ? true : asset.kind === kindFilter)
    .filter((asset) => {
      if (!normalizedQuery) return true;
      return [
        asset.title,
        asset.kind,
        asset.description,
        asset.subjectName,
        asset.moduleTitle,
        asset.lessonTitle,
        ...(asset.tags ?? []),
        getPreferredAssetValue(asset),
      ].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery);
    })
    .sort((left, right) => {
      const scopeDiff = getScopeRank(left, lessonId, moduleId, subjectId) - getScopeRank(right, lessonId, moduleId, subjectId);
      if (scopeDiff !== 0) return scopeDiff;
      return left.title.localeCompare(right.title);
    }), [assets, kindFilter, lessonId, moduleId, normalizedQuery, scopeFilter, stepType, subjectId]);

  const supportedKinds = useMemo(() => Array.from(new Set(assets
    .filter((asset) => stepSupportsAssetKind(stepType, asset.kind))
    .map((asset) => asset.kind))).sort((left, right) => left.localeCompare(right)), [assets, stepType]);

  const templatesForStep = useMemo(() => assetTemplates.filter((template) => template.appliesTo.includes(stepType)), [stepType]);

  const registrySummary = useMemo(() => {
    const allMedia = activitySteps.flatMap((step) => step.media ?? []);
    const allChoices = activitySteps.flatMap((step) => step.choices ?? []);
    const allDragItems = activitySteps.flatMap((step) => step.dragItems ?? []);
    const allDragTargets = activitySteps.flatMap((step) => step.dragTargets ?? []);
    const linkedValues = [
      ...allMedia.map((item) => Array.isArray(item.value) ? item.value.join(',') : String(item.value ?? '')).filter(Boolean),
      ...allChoices.map((item) => Array.isArray(item.media?.value) ? item.media?.value.join(',') : String(item.media?.value ?? '')).filter(Boolean),
      ...allDragItems.map((item) => Array.isArray(item.media?.value) ? item.media?.value.join(',') : String(item.media?.value ?? '')).filter(Boolean),
      ...allDragTargets.map((item) => Array.isArray(item.media?.value) ? item.media?.value.join(',') : String(item.media?.value ?? '')).filter(Boolean),
    ];
    return {
      linkedAssetCount: linkedValues.length,
      uniqueLinkedAssetCount: new Set(linkedValues).size,
      availableAssetCount: assets.length,
      scopedAssetCount: assets.filter((asset) => getScopeRank(asset, lessonId, moduleId, subjectId) <= 2).length,
    };
  }, [activitySteps, assets, lessonId, moduleId, subjectId]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ padding: 16, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B', fontWeight: 800 }}>Asset library lane</div>
            <div style={{ color: '#0f172a', fontWeight: 800, marginTop: 4 }}>Real library-backed inline insert</div>
            <div style={{ color: '#475569', lineHeight: 1.6, marginTop: 6 }}>
              This pulls from the live <code>/content/assets</code> registry so authors can inject runtime-ready references into the step without hand-writing pipe junk.
            </div>
          </div>
          <ModalLauncher
            buttonLabel="Open asset picker"
            title="Lesson asset picker"
            eyebrow="Asset library"
            description="Pick a real library asset and inject the safest available reference into this step. Scoped lesson/module assets float to the top."
            triggerStyle={{ background: '#0F766E', boxShadow: '0 16px 30px rgba(15, 118, 110, 0.18)' }}
          >
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0, 1.3fr) repeat(2, minmax(160px, 0.7fr))' }}>
                  <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
                    Search asset registry
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="audio, goat, prompt card…" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
                    Scope
                    <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as 'all' | 'scoped' | 'shared')} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                      <option value="all">All visible scopes</option>
                      <option value="scoped">Lesson / module / subject</option>
                      <option value="shared">Shared library only</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
                    Kind
                    <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                      <option value="all">All supported kinds</option>
                      {supportedKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                    </select>
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ color: '#64748B', fontSize: 13 }}>
                    Filtered for <strong>{stepType}</strong>. Lesson/module/subject-scoped assets appear first so authors reach the safe local option before the generic pile.
                  </div>
                  <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{visibleAssets.length} match{visibleAssets.length === 1 ? '' : 'es'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {visibleAssets.length ? visibleAssets.map((asset) => {
                  const preferredValue = getPreferredAssetValue(asset);
                  const scopeRank = getScopeRank(asset, lessonId, moduleId, subjectId);
                  const scopeLabel = scopeLabelForAsset(asset, scopeRank);

                  return (
                    <div key={asset.id} style={{ padding: 16, borderRadius: 18, background: 'white', border: '1px solid #E2E8F0', display: 'grid', gap: 10 }}>
                      <AssetPreview asset={asset} compact />
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{asset.title}</div>
                        <span style={{ padding: '5px 9px', borderRadius: 999, background: '#ECFDF5', color: '#166534', fontWeight: 800, fontSize: 12 }}>{asset.kind}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ padding: '5px 9px', borderRadius: 999, background: scopeRank <= 2 ? '#EEF2FF' : '#F8FAFC', color: scopeRank <= 2 ? '#3730A3' : '#475569', fontWeight: 800, fontSize: 12 }}>{scopeLabel}</span>
                        {asset.tags?.slice(0, 2).map((tag) => (
                          <span key={tag} style={{ padding: '5px 9px', borderRadius: 999, background: '#F8FAFC', color: '#475569', fontWeight: 700, fontSize: 12 }}>{tag}</span>
                        ))}
                      </div>
                      <div style={{ color: '#475569', lineHeight: 1.6 }}>{asset.description || 'No description yet. The file is still browseable, but someone should describe it better.'}</div>
                      <code style={{ display: 'block', padding: 10, borderRadius: 12, background: '#F8FAFC', color: '#334155', fontSize: 12, overflowWrap: 'anywhere' }}>{preferredValue}</code>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ color: '#64748B', fontSize: 12 }}>
                          Inserts <strong>{asset.fileUrl ? 'runtime URL' : asset.storagePath ? 'storage path' : 'asset key'}</strong> so authors are not stuck copy-pasting from the asset board.
                        </div>
                        <AssetRuntimeLink asset={asset} label="Open preview" />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {stepType === 'drag_to_match' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onChoiceLinesChange(appendDragItemLine(choiceLines, { kind: asset.kind, value: preferredValue, label: buildChoiceLabel(asset) }))}
                              style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, border: '1px solid #99F6E4', background: '#CCFBF1', color: '#115E59', cursor: 'pointer' }}
                            >
                              Add as drag card
                            </button>
                            <button
                              type="button"
                              onClick={() => onMediaLinesChange(appendDragTargetLine(mediaLines, { kind: asset.kind, value: preferredValue, prompt: buildChoiceLabel(asset) }))}
                              style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#3730A3', cursor: 'pointer' }}
                            >
                              Add as target zone
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onMediaLinesChange(appendMediaLine(mediaLines, { kind: asset.kind, value: preferredValue }))}
                              style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, border: '1px solid #99F6E4', background: '#CCFBF1', color: '#115E59', cursor: 'pointer' }}
                            >
                              Add as shared media
                            </button>
                            {(stepType === 'image_choice' || stepType === 'tap_choice') && stepSupportsAssetKind(stepType, asset.kind) ? (
                              <button
                                type="button"
                                onClick={() => onChoiceLinesChange(appendChoiceMediaLine(choiceLines, { kind: asset.kind, value: preferredValue, label: buildChoiceLabel(asset), isCorrect: false }))}
                                style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#3730A3', cursor: 'pointer' }}
                              >
                                Add as choice option
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ gridColumn: '1 / -1', padding: 18, borderRadius: 18, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', lineHeight: 1.6 }}>
                    No matching library assets yet for this step. That means the registry is thin, not that authors should go back to raw pipe-editing like cavepeople.
                  </div>
                )}
              </div>
            </div>
          </ModalLauncher>
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <div style={{ padding: 12, borderRadius: 14, background: 'white', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.1 }}>Linked assets</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 4 }}>{registrySummary.linkedAssetCount}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 14, background: 'white', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.1 }}>Unique refs</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 4 }}>{registrySummary.uniqueLinkedAssetCount}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 14, background: 'white', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.1 }}>Library assets</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 4 }}>{registrySummary.availableAssetCount}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 14, background: 'white', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.1 }}>Scoped first</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 4 }}>{registrySummary.scopedAssetCount}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {templatesForStep.map((template) => {
            const matchingAsset = visibleAssets.find((asset) => asset.kind === template.value || asset.kind === template.kind);
            const resolvedValue = matchingAsset ? getPreferredAssetValue(matchingAsset) : '';
            const disabled = !resolvedValue;

            return (
              <div key={template.id} style={{ padding: 14, borderRadius: 16, background: 'white', border: '1px solid #E2E8F0', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{template.label}</div>
                    <div style={{ color: '#475569', lineHeight: 1.6, marginTop: 4 }}>{template.note}</div>
                  </div>
                  <span style={{ padding: '5px 9px', borderRadius: 999, background: '#F8FAFC', color: '#475569', fontWeight: 800, fontSize: 12 }}>{template.category}</span>
                </div>
                <code style={{ display: 'block', padding: 10, borderRadius: 12, background: '#F8FAFC', color: '#334155', fontSize: 12, overflowWrap: 'anywhere' }}>{resolvedValue || `No ${template.kind} asset available yet`}</code>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!resolvedValue) return;
                    if (template.target === 'media') {
                      onMediaLinesChange(appendMediaLine(mediaLines, { kind: matchingAsset?.kind ?? template.kind, value: resolvedValue }));
                      return;
                    }
                    onChoiceLinesChange(appendChoiceMediaLine(choiceLines, {
                      kind: matchingAsset?.kind ?? template.kind,
                      value: resolvedValue,
                      label: matchingAsset ? buildChoiceLabel(matchingAsset) : (template.choiceLabel ?? template.label),
                      isCorrect: Boolean(template.choiceCorrect),
                    }));
                  }}
                  style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, border: '1px solid #C7D2FE', background: disabled ? '#E5E7EB' : '#EEF2FF', color: disabled ? '#6B7280' : '#3730A3', cursor: disabled ? 'not-allowed' : 'pointer' }}
                >
                  {disabled ? 'No matching asset yet' : 'Insert into this step'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
