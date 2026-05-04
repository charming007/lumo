'use client';

import React, { useMemo, useState } from 'react';
import { ModalLauncher } from './modal-launcher';
import { AssetPreview, AssetRuntimeLink } from './asset-preview';
import type { CurriculumModule, LessonAsset } from '../lib/types';
import { assetMatchesModuleContext } from '../lib/module-subject-match';
import {
  getLessonAssetKindLabel,
  getLessonAssetPreviewTone,
  getLessonAssetRuntimeReadiness,
  knownLessonAssetKinds,
  normalizeLessonAssetKind,
} from '../lib/lesson-runtime-preview';

type BuilderType = 'image_choice' | 'tap_choice' | 'drag_to_match' | 'word_build' | 'listen_repeat' | 'speak_answer' | 'letter_intro' | 'listen_answer';

type ChoiceRow = {
  id: string;
  label: string;
  isCorrect: boolean;
  mediaKind: string;
  mediaValue: string;
};

type DragItemRow = {
  id: string;
  label: string;
  targetId: string;
  mediaKind: string;
  mediaValue: string;
};

type MediaRow = {
  kind: string;
  value: string;
};

type DragTargetRow = {
  id: string;
  prompt: string;
  mediaKind: string;
  mediaValue: string;
};

type StyleObject = React.CSSProperties;

type Props = {
  type: string;
  choiceLines: string;
  mediaLines: string;
  assets?: LessonAsset[];
  subjectId?: string;
  subjectName?: string;
  moduleId?: string;
  moduleTitle?: string;
  lessonId?: string;
  onChoiceLinesChange: (value: string) => void;
  onMediaLinesChange: (value: string) => void;
  inputStyle: StyleObject;
  ghostButtonStyle: StyleObject;
  sectionLabel: React.ReactNode;
  fieldHint: (children: React.ReactNode) => React.ReactNode;
  fieldLabel: (children: React.ReactNode) => React.ReactNode;
};

const stackStyle: StyleObject = { display: 'grid', gap: 12 };
const cardStyle: StyleObject = {
  padding: 14,
  borderRadius: 16,
  border: '1px solid #CBD5E1',
  background: '#F8FAFC',
  display: 'grid',
  gap: 12,
};
const compactNoteStyle: StyleObject = {
  fontSize: 12,
  color: '#64748B',
  lineHeight: 1.5,
};
const emptyStateStyle: StyleObject = {
  padding: 12,
  borderRadius: 14,
  border: '1px dashed #CBD5E1',
  background: '#FFFFFF',
  color: '#64748B',
  lineHeight: 1.6,
};
const helperPillStyle: StyleObject = {
  padding: '6px 10px',
  borderRadius: 999,
  background: '#EEF2FF',
  color: '#3730A3',
  fontWeight: 700,
  fontSize: 12,
};
const miniInputStyle: StyleObject = {
  border: '1px solid #D1D5DB',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 14,
  width: '100%',
  background: 'white',
  minWidth: 0,
};

function parseChoiceLines(choiceLines: string): ChoiceRow[] {
  const rows = choiceLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [idRaw, labelRaw, correctnessRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
      return {
        id: idRaw || `choice-${index + 1}`,
        label: labelRaw || '',
        isCorrect: ['correct', 'true', 'yes', '1'].includes((correctnessRaw || '').toLowerCase()),
        mediaKind: mediaKindRaw ? normalizeLessonAssetKind(mediaKindRaw) : '',
        mediaValue: mediaValueRaw || '',
      };
    });

  return rows.length ? rows : [];
}

function serializeChoiceLines(rows: ChoiceRow[]) {
  return rows
    .map((row, index) => {
      const id = row.id.trim() || `choice-${index + 1}`;
      const label = row.label.trim();
      const correctness = row.isCorrect ? 'correct' : 'wrong';
      const mediaKind = row.mediaKind.trim();
      const mediaValue = row.mediaValue.trim();
      const parts = [id, label, correctness];
      if (mediaKind || mediaValue) {
        parts.push(mediaKind);
        parts.push(mediaValue);
      }
      return parts.join('|');
    })
    .filter((line) => line.replace(/\|/g, '').trim().length > 0)
    .join('\n');
}

function parseDragItemLines(choiceLines: string): DragItemRow[] {
  return choiceLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [idRaw, labelRaw, targetIdRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
      return {
        id: idRaw || `item-${index + 1}`,
        label: labelRaw || '',
        targetId: targetIdRaw || '',
        mediaKind: mediaKindRaw ? normalizeLessonAssetKind(mediaKindRaw) : '',
        mediaValue: mediaValueRaw || '',
      };
    });
}

function serializeDragItemLines(rows: DragItemRow[]) {
  return rows
    .map((row, index) => {
      const id = row.id.trim() || `item-${index + 1}`;
      const label = row.label.trim();
      const targetId = row.targetId.trim();
      const mediaKind = row.mediaKind.trim();
      const mediaValue = row.mediaValue.trim();
      const parts = [id, label, targetId];
      if (mediaKind || mediaValue) {
        parts.push(mediaKind);
        parts.push(mediaValue);
      }
      return parts.join('|');
    })
    .filter((line) => line.replace(/\|/g, '').trim().length > 0)
    .join('\n');
}

function parseMediaLines(mediaLines: string): MediaRow[] {
  return mediaLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kindRaw, valueRaw] = line.split('|').map((part) => part.trim());
      return {
        kind: normalizeLessonAssetKind(kindRaw || 'image'),
        value: valueRaw || '',
      };
    });
}

function serializeMediaLines(rows: MediaRow[]) {
  return rows
    .map((row) => `${row.kind.trim() || 'image'}|${row.value.trim()}`)
    .filter((line) => line.replace(/\|/g, '').trim().length > 0)
    .join('\n');
}

function parseDragTargetLines(mediaLines: string): DragTargetRow[] {
  return mediaLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [idRaw, promptRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
      return {
        id: idRaw || `target-${index + 1}`,
        prompt: promptRaw || '',
        mediaKind: mediaKindRaw ? normalizeLessonAssetKind(mediaKindRaw) : '',
        mediaValue: mediaValueRaw || '',
      };
    });
}

function serializeDragTargetLines(rows: DragTargetRow[]) {
  return rows
    .map((row, index) => {
      const id = row.id.trim() || `target-${index + 1}`;
      const prompt = row.prompt.trim();
      const mediaKind = row.mediaKind.trim();
      const mediaValue = row.mediaValue.trim();
      const parts = [id, prompt];
      if (mediaKind || mediaValue) {
        parts.push(mediaKind);
        parts.push(mediaValue);
      }
      return parts.join('|');
    })
    .filter((line) => line.replace(/\|/g, '').trim().length > 0)
    .join('\n');
}

function getChoiceLabels(type: BuilderType) {
  switch (type) {
    case 'image_choice':
      return {
        title: 'Picture card builder',
        hint: 'Build the exact learner answer cards here: one row = one picture card the learner can inspect and choose. Keep the right card obvious in authoring, not just in your head.',
        labelName: 'Picture card label',
        mediaTypeLabel: 'Card asset type',
        mediaValueLabel: 'Picture card file, URL, or asset key',
        mediaPlaceholder: 'For example: nurse-card, https://..., or storage/path/image.webp',
        emptyState: 'No picture cards yet. Add at least two cards so the learner actually has a visual choice to make.',
      };
    case 'tap_choice':
      return {
        title: 'Tap target builder',
        hint: 'Create the actual targets the learner taps. One row = one tappable target. Keep labels short and scannable, then attach support media only if the target itself needs it.',
        labelName: 'Tap target label',
        mediaTypeLabel: 'Target support asset type',
        mediaValueLabel: 'Target support file, URL, or key',
        mediaPlaceholder: 'Optional image/audio reference tied to this tap target',
        emptyState: 'No tap targets yet. Add at least two targets so the learner has a real decision instead of a dead-end button.',
      };
    case 'drag_to_match':
      return {
        title: 'Drag card builder',
        hint: 'Use the raw line format id|label|targetId|mediaKind|mediaValue for draggable cards. The structured rows help attach labels/assets, but targetId mapping still matters.',
        labelName: 'Draggable card label',
        mediaTypeLabel: 'Card asset type',
        mediaValueLabel: 'Card file, URL, or key',
        mediaPlaceholder: 'Optional card art or audio cue',
        emptyState: 'No draggable cards yet. Add the cards learners drag into the target zones.',
      };
    case 'word_build':
      return {
        title: 'Build piece builder',
        hint: 'Add the tiles, chunks, or word pieces learners manipulate. Attach card art or audio only when it genuinely helps the build.',
        labelName: 'Piece label',
        mediaTypeLabel: 'Piece asset type',
        mediaValueLabel: 'Piece asset file, URL, or key',
        mediaPlaceholder: 'Optional tile art, card reference, or audio cue',
        emptyState: 'No build pieces yet. Add the letters, chunks, or cards learners need to assemble the target word.',
      };
    default:
      return {
        title: 'Choice builder',
        hint: 'Add structured learner options here instead of editing pipe-delimited text.',
        labelName: 'Option label',
        mediaTypeLabel: 'Asset type',
        mediaValueLabel: 'Asset file, URL, or key',
        mediaPlaceholder: 'Optional asset reference',
        emptyState: 'No structured choices yet. Add rows here when the step needs learner-facing options.',
      };
  }
}

function getDragItemLabels() {
  return {
    title: 'Drag card builder',
    hint: 'Build the draggable cards here. Each card needs a stable id, a learner-facing label, and the target zone id it should land in.',
    targetIdLabel: 'Matching target zone id',
    mediaTypeLabel: 'Card asset type',
    mediaValueLabel: 'Card file, URL, or key',
    mediaPlaceholder: 'Optional card art or audio cue',
    emptyState: 'No draggable cards yet. Add the cards learners drag into the target zones.',
  };
}

function getMediaLabels(type: BuilderType) {
  switch (type) {
    case 'listen_repeat':
      return {
        title: 'Model cue builder',
        hint: 'Attach the exact cue learners hear or see before they echo it back. One row = one model cue, usually audio first, with transcript/prompt support only when it helps delivery.',
        typeLabel: 'Model cue type',
        valueLabel: 'Model cue file, URL, or key',
        placeholder: 'Audio file, transcript card key, or support image reference',
        emptyState: 'No model cue attached yet. Add the line learners repeat from so this does not fake a listen-and-repeat task with plain text alone.',
      };
    case 'speak_answer':
      return {
        title: 'Speaking support builder',
        hint: 'Attach the prompt card, illustration, or audio cue that helps the learner answer out loud.',
        typeLabel: 'Speaking support type',
        valueLabel: 'Support file, URL, or key',
        placeholder: 'Prompt card, image, or audio reference',
        emptyState: 'No speaking support attached yet. That is fine for a text-led oral prompt, but add one if the step depends on a visible cue.',
      };
    case 'listen_answer':
      return {
        title: 'Listening support builder',
        hint: 'Attach the audio, story card, or scene support learners need before answering.',
        typeLabel: 'Listening support type',
        valueLabel: 'Support file, URL, or key',
        placeholder: 'Audio prompt, story card, or visual cue reference',
        emptyState: 'No listening support attached yet. Add the story/audio cue if the answer depends on hearing something first.',
      };
    case 'letter_intro':
      return {
        title: 'Letter support builder',
        hint: 'Attach the letter card, trace card, anchor image, or sound cue used during the introduction.',
        typeLabel: 'Letter support type',
        valueLabel: 'Letter asset file, URL, or key',
        placeholder: 'Trace card, letter card, image, or audio reference',
        emptyState: 'No letter support attached yet. Add the card or cue that makes the letter intro visible to the learner.',
      };
    case 'image_choice':
      return {
        title: 'Shared prompt asset builder',
        hint: 'Optional step-level media shown above all answer cards, such as the scene image or spoken instruction cue.',
        typeLabel: 'Prompt asset type',
        valueLabel: 'Prompt asset file, URL, or key',
        placeholder: 'Shared scene image or instruction audio reference',
        emptyState: 'No shared prompt asset yet. That is optional if all the visual meaning already lives on the answer cards.',
      };
    case 'tap_choice':
      return {
        title: 'Shared prompt asset builder',
        hint: 'Optional shared asset shown before learners tap a target.',
        typeLabel: 'Prompt asset type',
        valueLabel: 'Prompt asset file, URL, or key',
        placeholder: 'Shared image, audio, or prompt-card reference',
        emptyState: 'No shared prompt asset yet. Add one only if learners need a common cue before tapping.',
      };
    case 'word_build':
      return {
        title: 'Build support builder',
        hint: 'Attach the target card, audio model, or extra support asset used to guide the build.',
        typeLabel: 'Build support type',
        valueLabel: 'Support file, URL, or key',
        placeholder: 'Word-card, tile art, or audio reference',
        emptyState: 'No build support asset yet. That is okay if the build pieces carry the whole interaction.',
      };
    default:
      return {
        title: 'Asset builder',
        hint: 'Add structured asset rows here instead of editing raw pipe-delimited text.',
        typeLabel: 'Asset type',
        valueLabel: 'Asset file, URL, or key',
        placeholder: 'Asset reference',
        emptyState: 'No assets attached yet.',
      };
  }
}

function getDragTargetLabels() {
  return {
    title: 'Target zone builder',
    hint: 'Build the actual drop zones here. One row = one visible target zone with its own id, prompt, and optional support media.',
    promptLabel: 'Target zone prompt',
    mediaTypeLabel: 'Target zone asset type',
    mediaValueLabel: 'Target zone file, URL, or key',
    mediaPlaceholder: 'Optional zone art or support cue',
    emptyState: 'No target zones yet. Add the drop zones learners drag into.',
  };
}

function getAssetIcon(kind: string) {
  switch (normalizeLessonAssetKind(kind)) {
    case 'audio': return '🔊';
    case 'letter-card': return '🔤';
    case 'trace-card': return '✍️';
    case 'tile':
    case 'word-card': return '🧩';
    case 'story-card':
    case 'prompt-card': return '🪪';
    case 'hint':
    case 'transcript': return '📝';
    default: return '🖼️';
  }
}

function getAssetExamples(kind: string) {
  switch (normalizeLessonAssetKind(kind)) {
    case 'audio': return ['storage/audio/unit-2/nurse-line.mp3', 'https://cdn.example.com/audio/nurse-line.mp3'];
    case 'image':
    case 'illustration': return ['storage/images/unit-2/nurse-card.webp', 'https://cdn.example.com/images/nurse-card.webp'];
    case 'prompt-card':
    case 'story-card': return ['story:helpers/nurse-scene', 'prompt:who-helps-people'];
    case 'trace-card':
    case 'letter-card': return ['trace:s', 'letter:s'];
    case 'tile':
    case 'word-card': return ['tile:su', 'word:sun'];
    case 'hint':
    case 'transcript': return ['Say the full sentence once first.', 'A nurse helps sick people.'];
    default: return ['asset-key-or-url'];
  }
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

function normalizeScopeValue(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
}

function getScopeRank(asset: LessonAsset, lessonId?: string, module?: { id?: string | null; title?: string | null; subjectId?: string | null; subjectName?: string | null } | null, subjectId?: string, subjectName?: string) {
  if (lessonId && asset.lessonId === lessonId) return 0;
  if (assetMatchesModuleContext(asset, module)) return 1;

  const normalizedSubjectId = normalizeScopeValue(subjectId);
  const normalizedAssetSubjectId = normalizeScopeValue(asset.subjectId);
  if (normalizedSubjectId && normalizedAssetSubjectId && normalizedAssetSubjectId === normalizedSubjectId) return 2;

  const normalizedSubjectName = normalizeScopeValue(subjectName);
  const normalizedAssetSubjectName = normalizeScopeValue(asset.subjectName);
  if (normalizedSubjectName && normalizedAssetSubjectName && normalizedAssetSubjectName === normalizedSubjectName) return 2;

  if (!asset.subjectId && !asset.moduleId && !asset.lessonId) return 3;
  return 4;
}

function scopeLabelForAsset(asset: LessonAsset, scopeRank: number) {
  if (scopeRank === 0) return `Lesson · ${asset.lessonTitle ?? asset.title}`;
  if (scopeRank === 1) return `Module · ${asset.moduleTitle ?? 'Scoped asset'}`;
  if (scopeRank === 2) return `Subject · ${asset.subjectName ?? 'Scoped asset'}`;
  if (scopeRank === 3) return 'Shared library';
  return 'Other scope';
}

function findAssetByValue(assets: LessonAsset[], value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return assets.find((asset) => {
    const preferred = getPreferredAssetValue(asset);
    return asset.id === trimmed || asset.storagePath === trimmed || asset.fileUrl === trimmed || asset.fileName === trimmed || preferred === trimmed;
  }) ?? null;
}

function AssetValuePreview({ kind, value }: { kind: string; value: string }) {
  const normalizedKind = normalizeLessonAssetKind(kind);
  const tone = getLessonAssetPreviewTone(normalizedKind);
  const readiness = getLessonAssetRuntimeReadiness(normalizedKind, value.trim() ? value.trim() : '');
  const looksLikeImage = ['image', 'illustration'].includes(normalizedKind) && /^https?:\/\//i.test(value.trim());

  return (
    <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 14, background: tone.bg, border: `1px solid ${tone.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: tone.text, fontWeight: 800 }}>
          <span>{getAssetIcon(normalizedKind)}</span>
          <span>{getLessonAssetKindLabel(normalizedKind)}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: readiness.ready ? '#166534' : '#92400E' }}>{readiness.label}</span>
      </div>
      {looksLikeImage ? (
        <img src={value.trim()} alt={getLessonAssetKindLabel(normalizedKind)} style={{ width: '100%', height: 92, objectFit: 'cover', borderRadius: 12, display: 'block', background: '#fff' }} />
      ) : (
        <div style={{ minHeight: 74, borderRadius: 12, background: 'rgba(255,255,255,0.72)', border: `1px dashed ${tone.border}`, display: 'grid', placeItems: 'center', padding: 12, textAlign: 'center' }}>
          <div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
            <div style={{ fontSize: 24 }}>{getAssetIcon(normalizedKind)}</div>
            <div style={{ color: tone.text, fontWeight: 700, fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word' }}>{value.trim() || 'Paste a file path, asset key, URL, or short support text.'}</div>
          </div>
        </div>
      )}
      <div style={{ color: tone.text, fontSize: 11, lineHeight: 1.45 }}>{readiness.detail}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {getAssetExamples(normalizedKind).map((example) => (
          <span key={example} style={{ padding: '5px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.72)', color: tone.text, border: `1px solid ${tone.border}`, fontSize: 11, fontWeight: 700 }}>
            {example}
          </span>
        ))}
      </div>
    </div>
  );
}

function InlineAssetPicker({
  assets,
  stepType,
  subjectId,
  subjectName,
  moduleId,
  moduleTitle,
  lessonId,
  selectedKind,
  selectedValue,
  title,
  onPick,
  onClear,
}: {
  assets: LessonAsset[];
  stepType: string;
  subjectId?: string;
  subjectName?: string;
  moduleId?: string;
  moduleTitle?: string;
  lessonId?: string;
  selectedKind: string;
  selectedValue: string;
  title: string;
  onPick: (asset: LessonAsset) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'scoped' | 'shared'>('all');
  const [kindFilter, setKindFilter] = useState('all');
  const currentAsset = useMemo(() => findAssetByValue(assets, selectedValue), [assets, selectedValue]);
  const activeModule = useMemo(() => {
    if (!moduleId && !moduleTitle) return null;
    return {
      id: moduleId ?? '',
      title: moduleTitle ?? '',
      subjectId,
      subjectName,
    };
  }, [moduleId, moduleTitle, subjectId, subjectName]);
  const visibleAssets = useMemo(() => assets
    .filter((asset) => Boolean(getPreferredAssetValue(asset)))
    .filter((asset) => stepSupportsAssetKind(stepType, asset.kind))
    .filter((asset) => scopeFilter === 'all' ? true : scopeFilter === 'shared' ? getScopeRank(asset, lessonId, activeModule, subjectId, subjectName) === 3 : getScopeRank(asset, lessonId, activeModule, subjectId, subjectName) <= 2)
    .filter((asset) => kindFilter === 'all' ? true : normalizeLessonAssetKind(asset.kind) === kindFilter)
    .filter((asset) => {
      const haystack = [asset.title, asset.description, asset.kind, asset.subjectName, asset.moduleTitle, asset.lessonTitle, asset.fileName, asset.storagePath, ...(asset.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !query.trim() || haystack.includes(query.trim().toLowerCase());
    })
    .sort((left, right) => left.title.localeCompare(right.title)), [activeModule, assets, kindFilter, lessonId, query, scopeFilter, stepType, subjectId, subjectName]);
  const supportedKinds = useMemo(() => Array.from(new Set(assets.filter((asset) => stepSupportsAssetKind(stepType, asset.kind)).map((asset) => normalizeLessonAssetKind(asset.kind)))).sort((a, b) => a.localeCompare(b)), [assets, stepType]);

  return (
    <div style={{ display: 'grid', gap: 10, padding: 12, borderRadius: 14, border: '1px solid #D7DEEA', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <strong style={{ color: '#0F172A' }}>{title}</strong>
          <div style={{ fontSize: 12, color: '#64748B' }}>Pick directly from uploaded assets / image library for this exact field.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setOpen((value) => !value)} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', fontWeight: 800, color: '#4338CA', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
            {currentAsset ? 'Replace from library' : 'Pick from library'}
          </button>
          {(selectedValue || currentAsset) ? (
            <button type="button" onClick={onClear} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', fontWeight: 700, color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA' }}>
              Clear asset
            </button>
          ) : null}
        </div>
      </div>

      {currentAsset ? (
        <div style={{ display: 'grid', gap: 10, padding: 10, borderRadius: 14, border: '1px solid #C7D2FE', background: '#F8FAFF' }}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '120px minmax(0, 1fr)' }}>
            <AssetPreview asset={currentAsset} compact />
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ color: '#0F172A' }}>{currentAsset.title}</strong>
                <span style={helperPillStyle}>{getLessonAssetKindLabel(currentAsset.kind)}</span>
                <span style={{ ...helperPillStyle, background: '#E2E8F0', color: '#334155' }}>{scopeLabelForAsset(currentAsset, getScopeRank(currentAsset, lessonId, activeModule, subjectId, subjectName))}</span>
              </div>
              {currentAsset.description ? <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.5 }}>{currentAsset.description}</div> : null}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: '#64748B' }}>
                <span>Using: {selectedValue || getPreferredAssetValue(currentAsset)}</span>
                <AssetRuntimeLink asset={currentAsset} label="Open runtime file" />
              </div>
            </div>
          </div>
        </div>
      ) : selectedValue.trim() ? (
        <div style={{ padding: 10, borderRadius: 12, border: '1px dashed #CBD5E1', background: '#F8FAFC', color: '#475569', fontSize: 13, lineHeight: 1.5 }}>
          Current reference: <strong>{selectedValue}</strong>
        </div>
      ) : null}

      {open ? (
        <div style={{ display: 'grid', gap: 10, padding: 12, borderRadius: 14, border: '1px solid #CBD5E1', background: '#F8FAFC' }}>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(180px, 1.3fr) repeat(2, minmax(130px, 0.8fr))' }}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, tags, file name…" style={miniInputStyle} />
            <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as 'all' | 'scoped' | 'shared')} style={miniInputStyle}>
              <option value="all">All scopes</option>
              <option value="scoped">Lesson/module/subject</option>
              <option value="shared">Shared library</option>
            </select>
            <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} style={miniInputStyle}>
              <option value="all">All asset kinds</option>
              {supportedKinds.map((kind) => <option key={kind} value={kind}>{getLessonAssetKindLabel(kind)}</option>)}
            </select>
          </div>
          <div style={{ maxHeight: 360, overflow: 'auto', display: 'grid', gap: 10 }}>
            {visibleAssets.length ? visibleAssets.map((asset) => {
              const preferredValue = getPreferredAssetValue(asset);
              const selected = selectedValue.trim() === preferredValue || selectedValue.trim() === asset.id;
              return (
                <div key={asset.id} style={{ display: 'grid', gap: 10, gridTemplateColumns: '120px minmax(0, 1fr) auto', padding: 10, borderRadius: 14, border: selected ? '1px solid #818CF8' : '1px solid #E2E8F0', background: selected ? '#EEF2FF' : '#fff' }}>
                  <AssetPreview asset={asset} compact />
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ color: '#0F172A' }}>{asset.title}</strong>
                      <span style={helperPillStyle}>{getLessonAssetKindLabel(asset.kind)}</span>
                      <span style={{ ...helperPillStyle, background: '#E2E8F0', color: '#334155' }}>{scopeLabelForAsset(asset, getScopeRank(asset, lessonId, activeModule, subjectId, subjectName))}</span>
                    </div>
                    {asset.description ? <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.5 }}>{asset.description}</div> : null}
                    <div style={{ fontSize: 12, color: '#64748B', wordBreak: 'break-word' }}>{preferredValue}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button type="button" onClick={() => onPick(asset)} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', fontWeight: 800, background: selected ? '#C7D2FE' : '#E0E7FF', color: '#3730A3', border: '1px solid #A5B4FC' }}>
                      {selected ? 'Selected' : 'Use asset'}
                    </button>
                  </div>
                </div>
              );
            }) : <div style={emptyStateStyle}>No matching assets in the current library filters.</div>}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {selectedKind ? getAssetExamples(selectedKind).map((example) => (
          <span key={example} style={{ padding: '5px 9px', borderRadius: 999, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 700 }}>
            {example}
          </span>
        )) : null}
      </div>
    </div>
  );
}

function ChoiceAttachmentCard({
  row,
  index,
  choiceLabels,
  onChange,
  onRemove,
  onUseExample,
  assetPicker,
}: {
  row: ChoiceRow;
  index: number;
  choiceLabels: ReturnType<typeof getChoiceLabels>;
  onChange: (patch: Partial<ChoiceRow>) => void;
  onRemove: () => void;
  onUseExample: (value: string) => void;
  assetPicker?: React.ReactNode;
}) {
  const attached = Boolean(row.mediaKind || row.mediaValue.trim());
  const tone = attached ? '#ECFDF5' : '#F8FAFC';
  const border = attached ? '#BBF7D0' : '#CBD5E1';

  return (
    <div style={{ padding: 14, borderRadius: 16, border: `1px solid ${border}`, background: tone, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <strong style={{ color: '#0F172A' }}>Option {index + 1}</strong>
          <span style={{ ...helperPillStyle, background: row.isCorrect ? '#DCFCE7' : '#F8FAFC', color: row.isCorrect ? '#166534' : '#475569' }}>
            {row.isCorrect ? 'Correct answer' : 'Distractor'}
          </span>
          <span style={{ ...helperPillStyle, background: attached ? '#EEF2FF' : '#FFFFFF', color: attached ? '#3730A3' : '#64748B' }}>
            {attached ? 'Attachment card ready' : 'No attachment yet'}
          </span>
        </div>
        <button type="button" onClick={onRemove} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', fontWeight: 700, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA' }}>Remove</button>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
          <span>Option ID</span>
          <input value={row.id} onChange={(event) => onChange({ id: event.target.value })} style={miniInputStyle} placeholder={`choice-${index + 1}`} />
        </label>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
          <span>{choiceLabels.labelName}</span>
          <input value={row.label} onChange={(event) => onChange({ label: event.target.value })} style={miniInputStyle} placeholder="What the learner sees" />
        </label>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
          <span>Answer status</span>
          <select value={row.isCorrect ? 'correct' : 'wrong'} onChange={(event) => onChange({ isCorrect: event.target.value === 'correct' })} style={miniInputStyle}>
            <option value="wrong">Distractor</option>
            <option value="correct">Correct answer</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 0.95fr) minmax(320px, 1.35fr)' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
            <span>{choiceLabels.mediaTypeLabel}</span>
            <select value={row.mediaKind} onChange={(event) => onChange({ mediaKind: event.target.value })} style={miniInputStyle}>
              <option value="">No attached asset</option>
              {knownLessonAssetKinds.map((kind) => <option key={kind} value={kind}>{getLessonAssetKindLabel(kind)}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
            <span>{choiceLabels.mediaValueLabel}</span>
            <input value={row.mediaValue} onChange={(event) => onChange({ mediaValue: event.target.value })} style={miniInputStyle} placeholder={choiceLabels.mediaPlaceholder} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {assetPicker}
            {row.mediaKind ? getAssetExamples(row.mediaKind).map((example) => (
              <button key={example} type="button" onClick={() => onUseExample(example)} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#4338CA', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                Use {example}
              </button>
            )) : null}
          </div>
        </div>
        <AssetValuePreview kind={row.mediaKind || 'image'} value={row.mediaValue} />
      </div>
    </div>
  );
}

function DragItemCard({
  row,
  index,
  dragItemLabels,
  onChange,
  onRemove,
  onUseExample,
  assetPicker,
}: {
  row: DragItemRow;
  index: number;
  dragItemLabels: ReturnType<typeof getDragItemLabels>;
  onChange: (patch: Partial<DragItemRow>) => void;
  onRemove: () => void;
  onUseExample: (value: string) => void;
  assetPicker?: React.ReactNode;
}) {
  const attached = Boolean(row.mediaKind || row.mediaValue.trim());

  return (
    <div style={{ padding: 14, borderRadius: 16, border: `1px solid ${attached ? '#BBF7D0' : '#CBD5E1'}`, background: attached ? '#ECFDF5' : '#F8FAFC', display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <strong style={{ color: '#0F172A' }}>Card {index + 1}</strong>
          <span style={{ ...helperPillStyle, background: attached ? '#EEF2FF' : '#FFFFFF', color: attached ? '#3730A3' : '#64748B' }}>
            {attached ? 'Attachment card ready' : 'No attachment yet'}
          </span>
        </div>
        <button type="button" onClick={onRemove} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', fontWeight: 700, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA' }}>Remove</button>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
          <span>Card ID</span>
          <input value={row.id} onChange={(event) => onChange({ id: event.target.value })} style={miniInputStyle} placeholder={`item-${index + 1}`} />
        </label>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
          <span>Draggable card label</span>
          <input value={row.label} onChange={(event) => onChange({ label: event.target.value })} style={miniInputStyle} placeholder="What the learner drags" />
        </label>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
          <span>{dragItemLabels.targetIdLabel}</span>
          <input value={row.targetId} onChange={(event) => onChange({ targetId: event.target.value })} style={miniInputStyle} placeholder="target-1" />
        </label>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 0.95fr) minmax(320px, 1.35fr)' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
            <span>{dragItemLabels.mediaTypeLabel}</span>
            <select value={row.mediaKind} onChange={(event) => onChange({ mediaKind: event.target.value })} style={miniInputStyle}>
              <option value="">No attached asset</option>
              {knownLessonAssetKinds.map((kind) => <option key={kind} value={kind}>{getLessonAssetKindLabel(kind)}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
            <span>{dragItemLabels.mediaValueLabel}</span>
            <input value={row.mediaValue} onChange={(event) => onChange({ mediaValue: event.target.value })} style={miniInputStyle} placeholder={dragItemLabels.mediaPlaceholder} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {assetPicker}
            {row.mediaKind ? getAssetExamples(row.mediaKind).map((example) => (
              <button key={example} type="button" onClick={() => onUseExample(example)} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#4338CA', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                Use {example}
              </button>
            )) : null}
          </div>
        </div>
        <AssetValuePreview kind={row.mediaKind || 'image'} value={row.mediaValue} />
      </div>
    </div>
  );
}

function SharedAssetCard({
  row,
  index,
  mediaLabels,
  onChange,
  onRemove,
  onUseExample,
  assetPicker,
}: {
  row: MediaRow;
  index: number;
  mediaLabels: ReturnType<typeof getMediaLabels>;
  onChange: (patch: Partial<MediaRow>) => void;
  onRemove: () => void;
  onUseExample: (value: string) => void;
  assetPicker?: React.ReactNode;
}) {
  return (
    <div style={{ padding: 14, borderRadius: 16, border: '1px solid #CBD5E1', background: '#FFFFFF', display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <strong style={{ color: '#0F172A' }}>Asset {index + 1}</strong>
          <span style={helperPillStyle}>{getLessonAssetKindLabel(row.kind)}</span>
        </div>
        <button type="button" onClick={onRemove} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', fontWeight: 700, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA' }}>Remove</button>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 0.95fr) minmax(320px, 1.35fr)' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
            <span>{mediaLabels.typeLabel}</span>
            <select value={row.kind} onChange={(event) => onChange({ kind: event.target.value })} style={miniInputStyle}>
              {knownLessonAssetKinds.map((kind) => <option key={kind} value={kind}>{getLessonAssetKindLabel(kind)}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
            <span>{mediaLabels.valueLabel}</span>
            <input value={row.value} onChange={(event) => onChange({ value: event.target.value })} style={miniInputStyle} placeholder={mediaLabels.placeholder} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {assetPicker}
            {getAssetExamples(row.kind).map((example) => (
              <button key={example} type="button" onClick={() => onUseExample(example)} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#4338CA', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                Use {example}
              </button>
            ))}
          </div>
        </div>
        <AssetValuePreview kind={row.kind} value={row.value} />
      </div>
    </div>
  );
}

function DragTargetCard({
  row,
  index,
  targetLabels,
  onChange,
  onRemove,
  onUseExample,
  assetPicker,
}: {
  row: DragTargetRow;
  index: number;
  targetLabels: ReturnType<typeof getDragTargetLabels>;
  onChange: (patch: Partial<DragTargetRow>) => void;
  onRemove: () => void;
  onUseExample: (value: string) => void;
  assetPicker?: React.ReactNode;
}) {
  const attached = Boolean(row.mediaKind || row.mediaValue.trim());

  return (
    <div style={{ padding: 14, borderRadius: 16, border: `1px solid ${attached ? '#BBF7D0' : '#CBD5E1'}`, background: attached ? '#ECFDF5' : '#FFFFFF', display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <strong style={{ color: '#0F172A' }}>Target zone {index + 1}</strong>
          <span style={helperPillStyle}>{attached && row.mediaKind ? getLessonAssetKindLabel(row.mediaKind) : 'Prompt-led zone'}</span>
        </div>
        <button type="button" onClick={onRemove} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', fontWeight: 700, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA' }}>Remove</button>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
          <span>Target zone ID</span>
          <input value={row.id} onChange={(event) => onChange({ id: event.target.value })} style={miniInputStyle} placeholder={`target-${index + 1}`} />
        </label>
        <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
          <span>{targetLabels.promptLabel}</span>
          <input value={row.prompt} onChange={(event) => onChange({ prompt: event.target.value })} style={miniInputStyle} placeholder="Sort matching cards here" />
        </label>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 0.95fr) minmax(320px, 1.35fr)' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
            <span>{targetLabels.mediaTypeLabel}</span>
            <select value={row.mediaKind} onChange={(event) => onChange({ mediaKind: event.target.value })} style={miniInputStyle}>
              <option value="">No attached asset</option>
              {knownLessonAssetKinds.map((kind) => <option key={kind} value={kind}>{getLessonAssetKindLabel(kind)}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
            <span>{targetLabels.mediaValueLabel}</span>
            <input value={row.mediaValue} onChange={(event) => onChange({ mediaValue: event.target.value })} style={miniInputStyle} placeholder={targetLabels.mediaPlaceholder} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {assetPicker}
            {row.mediaKind ? getAssetExamples(row.mediaKind).map((example) => (
              <button key={example} type="button" onClick={() => onUseExample(example)} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#4338CA', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                Use {example}
              </button>
            )) : null}
          </div>
        </div>
        <AssetValuePreview kind={row.mediaKind || 'image'} value={row.mediaValue} />
      </div>
    </div>
  );
}

export function LessonActivityStructuredBuilders(props: Props) {
  const builderType = props.type as BuilderType;
  const supportsChoices = builderType === 'image_choice' || builderType === 'tap_choice' || builderType === 'drag_to_match' || builderType === 'word_build';
  const supportsMedia = supportsChoices || builderType === 'listen_repeat' || builderType === 'listen_answer' || builderType === 'speak_answer' || builderType === 'letter_intro';
  const usesDragRows = builderType === 'drag_to_match';
  const activeModule = useMemo(() => {
    if (!props.moduleId && !props.moduleTitle) return null;
    return {
      id: props.moduleId ?? '',
      title: props.moduleTitle ?? '',
      subjectId: props.subjectId,
      subjectName: props.subjectName,
    };
  }, [props.moduleId, props.moduleTitle, props.subjectId, props.subjectName]);

  if (!supportsChoices && !supportsMedia) return null;

  const choiceRows = usesDragRows ? [] : parseChoiceLines(props.choiceLines);
  const dragItemRows = usesDragRows ? parseDragItemLines(props.choiceLines) : [];
  const mediaRows = usesDragRows ? [] : parseMediaLines(props.mediaLines);
  const dragTargetRows = usesDragRows ? parseDragTargetLines(props.mediaLines) : [];
  const choiceLabels = getChoiceLabels(builderType);
  const dragItemLabels = getDragItemLabels();
  const mediaLabels = getMediaLabels(builderType);
  const dragTargetLabels = getDragTargetLabels();
  const attachedChoiceCount = usesDragRows
    ? dragItemRows.filter((row) => row.mediaKind && row.mediaValue.trim()).length
    : choiceRows.filter((row) => row.mediaKind && row.mediaValue.trim()).length;
  const readyMediaCount = usesDragRows
    ? dragTargetRows.filter((row) => row.prompt.trim() || row.mediaValue.trim()).length
    : mediaRows.filter((row) => row.value.trim()).length;
  const pickerAssets = props.assets ?? [];

  const updateChoiceRows = (updater: (rows: ChoiceRow[]) => ChoiceRow[]) => {
    props.onChoiceLinesChange(serializeChoiceLines(updater(choiceRows)));
  };
  const updateDragItemRows = (updater: (rows: DragItemRow[]) => DragItemRow[]) => {
    props.onChoiceLinesChange(serializeDragItemLines(updater(dragItemRows)));
  };
  const updateMediaRows = (updater: (rows: MediaRow[]) => MediaRow[]) => {
    props.onMediaLinesChange(serializeMediaLines(updater(mediaRows)));
  };
  const updateDragTargetRows = (updater: (rows: DragTargetRow[]) => DragTargetRow[]) => {
    props.onMediaLinesChange(serializeDragTargetLines(updater(dragTargetRows)));
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {supportsChoices ? (
        <div style={cardStyle}>
          {props.sectionLabel}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1E293B' }}>{usesDragRows ? dragItemLabels.title : choiceLabels.title}</div>
              <span style={helperPillStyle}>{usesDragRows ? dragItemRows.length : choiceRows.length} option{(usesDragRows ? dragItemRows.length : choiceRows.length) === 1 ? '' : 's'}</span>
              <span style={{ ...helperPillStyle, background: attachedChoiceCount ? '#DCFCE7' : '#F8FAFC', color: attachedChoiceCount ? '#166534' : '#475569' }}>
                {attachedChoiceCount}/{usesDragRows ? dragItemRows.length || 0 : choiceRows.length || 0} with attachments
              </span>
            </div>
          </div>
          <div style={compactNoteStyle}>{usesDragRows ? dragItemLabels.hint : choiceLabels.hint}</div>
          <div style={{ padding: 12, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
            Asset picking now lives inside each option row. Authors can browse the uploaded asset/image library right where they attach the field, then preview, replace, or clear without jumping to a detached panel.
          </div>
          {usesDragRows ? (
            dragItemRows.length ? (
              <div style={stackStyle}>
                {dragItemRows.map((row, index) => (
                  <DragItemCard
                    key={`${row.id}-${index}`}
                    row={row}
                    index={index}
                    dragItemLabels={dragItemLabels}
                    onChange={(patch) => updateDragItemRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))}
                    onRemove={() => updateDragItemRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                    onUseExample={(value) => updateDragItemRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, mediaValue: value } : item))}
                    assetPicker={pickerAssets.length ? (
                      <InlineAssetPicker
                        assets={pickerAssets}
                        stepType={builderType}
                        subjectId={props.subjectId}
                        subjectName={props.subjectName}
                        moduleId={props.moduleId}
                        moduleTitle={props.moduleTitle}
                        lessonId={props.lessonId}
                        selectedKind={row.mediaKind}
                        selectedValue={row.mediaValue}
                        title={`Drag card ${index + 1} asset picker`}
                        onPick={(asset) => updateDragItemRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, mediaKind: normalizeLessonAssetKind(asset.kind), mediaValue: getPreferredAssetValue(asset), label: item.label || asset.title } : item))}
                        onClear={() => updateDragItemRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, mediaValue: '' } : item))}
                      />
                    ) : null}
                  />
                ))}
              </div>
            ) : (
              <div style={emptyStateStyle}>{dragItemLabels.emptyState}</div>
            )
          ) : choiceRows.length ? (
            <div style={stackStyle}>
              {choiceRows.map((row, index) => (
                <ChoiceAttachmentCard
                  key={`${row.id}-${index}`}
                  row={row}
                  index={index}
                  choiceLabels={choiceLabels}
                  onChange={(patch) => updateChoiceRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))}
                  onRemove={() => updateChoiceRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                  onUseExample={(value) => updateChoiceRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, mediaValue: value } : item))}
                  assetPicker={pickerAssets.length ? (
                    <InlineAssetPicker
                      assets={pickerAssets}
                      stepType={builderType}
                      subjectId={props.subjectId}
                      moduleId={props.moduleId}
                      moduleTitle={props.moduleTitle}
                      lessonId={props.lessonId}
                      selectedKind={row.mediaKind}
                      selectedValue={row.mediaValue}
                      title={`Option ${index + 1} asset picker`}
                      onPick={(asset) => updateChoiceRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, mediaKind: normalizeLessonAssetKind(asset.kind), mediaValue: getPreferredAssetValue(asset), label: item.label || asset.title } : item))}
                      onClear={() => updateChoiceRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, mediaValue: '' } : item))}
                    />
                  ) : null}
                />
              ))}
            </div>
          ) : (
            <div style={emptyStateStyle}>{choiceLabels.emptyState}</div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => usesDragRows ? updateDragItemRows((rows) => [...rows, { id: `item-${rows.length + 1}`, label: '', targetId: '', mediaKind: '', mediaValue: '' }]) : updateChoiceRows((rows) => [...rows, { id: `choice-${rows.length + 1}`, label: '', isCorrect: false, mediaKind: builderType === 'image_choice' ? 'image' : '', mediaValue: '' }])} style={props.ghostButtonStyle}>{usesDragRows ? '+ Add card' : '+ Add option'}</button>
          </div>
          {props.fieldHint(usesDragRows ? 'Each drag card needs a stable target zone id so runtime can map every drop correctly.' : 'Use attachments when the learner needs to see, hear, or tap something concrete. Leave them blank only when the step is intentionally text-led.')}
        </div>
      ) : null}

      {supportsMedia ? (
        <div style={cardStyle}>
          {props.sectionLabel}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1E293B' }}>{usesDragRows ? dragTargetLabels.title : mediaLabels.title}</div>
              <span style={helperPillStyle}>{usesDragRows ? dragTargetRows.length : mediaRows.length} asset{(usesDragRows ? dragTargetRows.length : mediaRows.length) === 1 ? '' : 's'}</span>
              <span style={{ ...helperPillStyle, background: readyMediaCount ? '#DCFCE7' : '#F8FAFC', color: readyMediaCount ? '#166534' : '#475569' }}>
                {readyMediaCount}/{usesDragRows ? dragTargetRows.length || 0 : mediaRows.length || 0} runtime-ready
              </span>
            </div>
          </div>
          <div style={compactNoteStyle}>{usesDragRows ? dragTargetLabels.hint : mediaLabels.hint}</div>
          {usesDragRows ? (
            dragTargetRows.length ? (
              <div style={stackStyle}>
                {dragTargetRows.map((row, index) => (
                  <DragTargetCard
                    key={`${row.id}-${index}`}
                    row={row}
                    index={index}
                    targetLabels={dragTargetLabels}
                    onChange={(patch) => updateDragTargetRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))}
                    onRemove={() => updateDragTargetRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                    onUseExample={(value) => updateDragTargetRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, mediaValue: value } : item))}
                    assetPicker={pickerAssets.length ? (
                      <InlineAssetPicker
                        assets={pickerAssets}
                        stepType={builderType}
                        subjectId={props.subjectId}
                        subjectName={props.subjectName}
                        moduleId={props.moduleId}
                        moduleTitle={props.moduleTitle}
                        lessonId={props.lessonId}
                        selectedKind={row.mediaKind}
                        selectedValue={row.mediaValue}
                        title={`Target zone ${index + 1} asset picker`}
                        onPick={(asset) => updateDragTargetRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, mediaKind: normalizeLessonAssetKind(asset.kind), mediaValue: getPreferredAssetValue(asset) } : item))}
                        onClear={() => updateDragTargetRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, mediaValue: '' } : item))}
                      />
                    ) : null}
                  />
                ))}
              </div>
            ) : (
              <div style={emptyStateStyle}>{dragTargetLabels.emptyState}</div>
            )
          ) : mediaRows.length ? (
            <div style={stackStyle}>
              {mediaRows.map((row, index) => (
                <SharedAssetCard
                  key={`${row.kind}-${index}`}
                  row={row}
                  index={index}
                  mediaLabels={mediaLabels}
                  onChange={(patch) => updateMediaRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))}
                  onRemove={() => updateMediaRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                  onUseExample={(value) => updateMediaRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, value } : item))}
                  assetPicker={pickerAssets.length ? (
                    <InlineAssetPicker
                      assets={pickerAssets}
                      stepType={builderType}
                      subjectId={props.subjectId}
                      moduleId={props.moduleId}
                      moduleTitle={props.moduleTitle}
                      lessonId={props.lessonId}
                      selectedKind={row.kind}
                      selectedValue={row.value}
                      title={`Shared media ${index + 1} asset picker`}
                      onPick={(asset) => updateMediaRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, kind: normalizeLessonAssetKind(asset.kind), value: getPreferredAssetValue(asset) } : item))}
                      onClear={() => updateMediaRows((rows) => rows.map((item, itemIndex) => itemIndex === index ? { ...item, value: '' } : item))}
                    />
                  ) : null}
                />
              ))}
            </div>
          ) : (
            <div style={emptyStateStyle}>{mediaLabels.emptyState}</div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => usesDragRows ? updateDragTargetRows((rows) => [...rows, { id: `target-${rows.length + 1}`, prompt: '', mediaKind: 'image', mediaValue: '' }]) : updateMediaRows((rows) => [...rows, { kind: builderType === 'listen_repeat' ? 'audio' : builderType === 'letter_intro' ? 'letter-card' : builderType === 'word_build' ? 'word-card' : 'image', value: '' }])} style={props.ghostButtonStyle}>{usesDragRows ? '+ Add target zone' : '+ Add asset'}</button>
          </div>
          {props.fieldHint(usesDragRows ? 'Target zones need stable ids plus visible prompts so every draggable card has a real destination.' : 'Shared assets are the top-of-step cue: scene art, audio model, transcript, prompt card, or build anchor. Keep them explicit so the preview is honest.')}
        </div>
      ) : null}
    </div>
  );
}
