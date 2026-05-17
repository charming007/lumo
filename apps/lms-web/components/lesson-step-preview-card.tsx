'use client';

import { getPreviewAssetSummary } from './lesson-authoring-shared';
import { lessonStepTypeLabelMap } from './lesson-step-authoring';
import { buildLessonAssetPreviewItems, getLessonAssetKindLabel, getStepRuntimePreviewHints } from '../lib/lesson-runtime-preview';
import type { LessonActivityStep, LessonAsset } from '../lib/types';

function AssetPreviewChip({ item }: { item: ReturnType<typeof buildLessonAssetPreviewItems>[number] }) {
  const isImageLike = ['image', 'illustration'].includes(item.kind) && /^https?:\/\//i.test(item.previewValue);
  const isAudio = item.kind === 'audio';
  const title = item.choiceLabel ? `${item.label} • ${getLessonAssetKindLabel(item.kind)}` : item.label;

  return (
    <div style={{ display: 'grid', gap: 8, minWidth: 0, padding: 10, borderRadius: 14, background: item.tone.bg, border: `1px solid ${item.tone.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ color: item.tone.text, fontSize: 12 }}>{title}</strong>
        <span style={{ color: item.readiness.ready ? '#166534' : '#92400E', fontSize: 11, fontWeight: 800 }}>{item.readiness.label}</span>
      </div>
      {isImageLike ? (
        <img src={item.previewValue} alt={title} style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 12, display: 'block', background: '#fff' }} />
      ) : (
        <div style={{ minHeight: 72, borderRadius: 12, background: 'rgba(255,255,255,0.72)', border: `1px dashed ${item.tone.border}`, display: 'grid', placeItems: 'center', padding: 12, textAlign: 'center' }}>
          <div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
            <div style={{ fontSize: 24 }}>{isAudio ? '🔊' : item.kind === 'letter-card' ? '🔤' : item.kind === 'trace-card' ? '✍️' : item.kind === 'tile' || item.kind === 'word-card' ? '🧩' : item.kind === 'story-card' || item.kind === 'prompt-card' ? '🪪' : item.kind === 'hint' || item.kind === 'transcript' ? '📝' : '🖼️'}</div>
            <div style={{ color: item.tone.text, fontWeight: 700, fontSize: 12, lineHeight: 1.35, wordBreak: 'break-word' }}>{item.previewValue || 'Value missing'}</div>
          </div>
        </div>
      )}
      <div style={{ color: item.tone.text, fontSize: 11, lineHeight: 1.45 }}>{item.readiness.detail}</div>
    </div>
  );
}

export function LessonStepPreviewCard({
  step,
  index,
  showRuntimeHints = false,
  assets = [],
}: {
  step: LessonActivityStep;
  index: number;
  showRuntimeHints?: boolean;
  assets?: LessonAsset[];
}) {
  const assetSummary = getPreviewAssetSummary(step);
  const runtimePreview = showRuntimeHints ? getStepRuntimePreviewHints(step, assets) : null;
  const previewItems = runtimePreview?.previewItems ?? buildLessonAssetPreviewItems(step, assets);
  const readinessTone = assetSummary.isMediaBacked ? { bg: '#ECFDF5', text: '#166534', border: '#BBF7D0' } : { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };

  return (
    <div style={{ display: 'grid', gap: 10, padding: 12, borderRadius: 14, background: 'white', border: '1px solid #e2e8f0', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <strong>{index + 1}. {step.title || step.prompt}</strong>
        <span style={{ color: '#7C3AED', fontWeight: 700 }}>{step.durationMinutes || 0} min</span>
      </div>
      <div style={{ color: '#475569', fontSize: 14 }}>{step.detail || step.prompt || 'Add learner-facing guidance for this step.'}</div>
      <div style={{ color: '#64748B', fontSize: 12 }}>{lessonStepTypeLabelMap[step.type] ?? step.type} • Evidence: {step.evidence || 'Not set yet'}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {step.choices && step.choices.length > 0 ? <span style={{ color: '#7C3AED', fontSize: 12, fontWeight: 700 }}>{step.choices.length} choice option{step.choices.length === 1 ? '' : 's'}</span> : null}
        {step.dragItems && step.dragItems.length > 0 ? <span style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>{step.dragItems.length} drag card{step.dragItems.length === 1 ? '' : 's'}</span> : null}
        {step.dragTargets && step.dragTargets.length > 0 ? <span style={{ color: '#0891B2', fontSize: 12, fontWeight: 700 }}>{step.dragTargets.length} target zone{step.dragTargets.length === 1 ? '' : 's'}</span> : null}
        {step.media && step.media.length > 0 ? <span style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>{step.media.length} media cue{step.media.length === 1 ? '' : 's'}</span> : null}
        <span style={{ padding: '4px 8px', borderRadius: 999, background: readinessTone.bg, color: readinessTone.text, border: `1px solid ${readinessTone.border}`, fontSize: 12, fontWeight: 800 }}>{assetSummary.readinessLabel}</span>
        {assetSummary.assetFootprint ? <span style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>{assetSummary.assetFootprint}</span> : null}
      </div>
      {assetSummary.assetKinds.length ? <div style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>{assetSummary.assetKinds.join(' • ')}</div> : null}
      <div style={{ color: assetSummary.tone === 'warn' ? '#B45309' : assetSummary.tone === 'good' ? '#166534' : '#64748B', fontSize: 12, lineHeight: 1.5 }}>
        <strong>{assetSummary.label}:</strong> {assetSummary.detail}
      </div>
      {(step.targetAudio || step.supportAudio) ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {step.targetAudio ? <span style={{ padding: '4px 8px', borderRadius: 999, background: '#EEF2FF', color: '#3730A3', fontSize: 12, fontWeight: 800 }}>English audio · {step.targetAudio.value || step.targetAudio.assetId || 'configured'}</span> : null}
          {step.supportAudio ? <span style={{ padding: '4px 8px', borderRadius: 999, background: '#FFF7ED', color: '#9A3412', fontSize: 12, fontWeight: 800 }}>Hausa audio · {step.supportAudio.source === 'phrase-bank' ? step.supportAudio.phraseId || step.supportAudio.phraseText || 'phrase-bank ref' : step.supportAudio.value || step.supportAudio.assetId || 'configured'}</span> : null}
        </div>
      ) : null}
      {previewItems.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ color: '#0F172A', fontSize: 12, fontWeight: 800 }}>What the learner app should render</div>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {previewItems.map((item) => <AssetPreviewChip key={item.key} item={item} />)}
          </div>
        </div>
      ) : null}
      {runtimePreview ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 8px', borderRadius: 999, background: runtimePreview.hints.length ? '#FEF3C7' : '#ECFDF5', color: runtimePreview.hints.length ? '#92400E' : '#166534', fontWeight: 800, fontSize: 12 }}>
              {runtimePreview.readyLabel}
            </span>
          </div>
          <div style={{ color: runtimePreview.hints.length ? '#92400E' : '#166534', fontSize: 12, lineHeight: 1.5 }}>
            {runtimePreview.hints.length ? runtimePreview.hints[0] : 'Preview cards now reflect the asset kinds learner runtime should show, play, or surface as support.'}
          </div>
        </div>
      ) : null}
    </div>
  );
}
