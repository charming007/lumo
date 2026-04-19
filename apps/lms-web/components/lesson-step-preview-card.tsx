'use client';

import { getPreviewAssetSummary } from './lesson-authoring-shared';
import { lessonStepTypeLabelMap } from './lesson-step-authoring';
import { getStepRuntimePreviewHints } from '../lib/lesson-runtime-preview';
import type { LessonActivityStep } from '../lib/types';

export function LessonStepPreviewCard({
  step,
  index,
  showRuntimeHints = false,
}: {
  step: LessonActivityStep;
  index: number;
  showRuntimeHints?: boolean;
}) {
  const assetSummary = getPreviewAssetSummary(step);
  const runtimePreview = showRuntimeHints ? getStepRuntimePreviewHints(step) : null;
  const readinessTone = assetSummary.isMediaBacked ? { bg: '#ECFDF5', text: '#166534', border: '#BBF7D0' } : { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };

  return (
    <div style={{ display: 'grid', gap: 6, padding: 12, borderRadius: 14, background: 'white', border: '1px solid #e2e8f0', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <strong>{index + 1}. {step.title || step.prompt}</strong>
        <span style={{ color: '#7C3AED', fontWeight: 700 }}>{step.durationMinutes || 0} min</span>
      </div>
      <div style={{ color: '#475569', fontSize: 14 }}>{step.detail || step.prompt || 'Add learner-facing guidance for this step.'}</div>
      <div style={{ color: '#64748B', fontSize: 12 }}>{lessonStepTypeLabelMap[step.type] ?? step.type} • Evidence: {step.evidence || 'Not set yet'}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {step.choices && step.choices.length > 0 ? <span style={{ color: '#7C3AED', fontSize: 12, fontWeight: 700 }}>{step.choices.length} choice option{step.choices.length === 1 ? '' : 's'}</span> : null}
        {step.media && step.media.length > 0 ? <span style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>{step.media.length} media cue{step.media.length === 1 ? '' : 's'}</span> : null}
        <span style={{ padding: '4px 8px', borderRadius: 999, background: readinessTone.bg, color: readinessTone.text, border: `1px solid ${readinessTone.border}`, fontSize: 12, fontWeight: 800 }}>{assetSummary.readinessLabel}</span>
        {assetSummary.assetFootprint ? <span style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>{assetSummary.assetFootprint}</span> : null}
      </div>
      {assetSummary.assetKinds.length ? <div style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>{assetSummary.assetKinds.join(' • ')}</div> : null}
      <div style={{ color: assetSummary.tone === 'warn' ? '#B45309' : assetSummary.tone === 'good' ? '#166534' : '#64748B', fontSize: 12, lineHeight: 1.5 }}>
        <strong>{assetSummary.label}:</strong> {assetSummary.detail}
      </div>
      {runtimePreview ? (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 8px', borderRadius: 999, background: runtimePreview.hints.length ? '#FEF3C7' : '#ECFDF5', color: runtimePreview.hints.length ? '#92400E' : '#166534', fontWeight: 800, fontSize: 12 }}>
              {runtimePreview.hints.length ? 'Needs runtime polish' : 'Preview looks learner-ready'}
            </span>
          </div>
          {runtimePreview.hints.length ? <div style={{ color: '#92400E', fontSize: 12, lineHeight: 1.5 }}>{runtimePreview.hints[0]}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
