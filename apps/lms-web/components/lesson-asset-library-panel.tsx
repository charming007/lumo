'use client';

import { useMemo, useState } from 'react';
import { ModalLauncher } from './modal-launcher';
import type { LessonActivityStep } from '../lib/types';

type AssetRecord = {
  id: string;
  title: string;
  kind: string;
  category: string;
  value: string;
  usage: string[];
  note: string;
};

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

const knownAssets: AssetRecord[] = [
  {
    id: 'asset-audio-greeting-ha',
    title: 'Greeting prompt · Hausa audio',
    kind: 'audio',
    category: 'Listening cues',
    value: 'library://audio/greetings/hausa-greeting-v1.mp3',
    usage: ['listen_repeat', 'listen_answer', 'speak_answer'],
    note: 'Short guided prompt for repeat-after-me and comprehension warmups.',
  },
  {
    id: 'asset-image-market-scene',
    title: 'Market scene card',
    kind: 'image',
    category: 'Scene cards',
    value: 'library://images/scenes/market-day-card.webp',
    usage: ['image_choice', 'tap_choice', 'speak_answer'],
    note: 'Visual anchor card for noun, action, and context prompts.',
  },
  {
    id: 'asset-letter-ba-card',
    title: 'Letter BA tracing card',
    kind: 'trace-card',
    category: 'Letter intro',
    value: 'library://cards/letters/ba-trace-card.svg',
    usage: ['letter_intro', 'word_build'],
    note: 'Tracing and sound association support for letter introduction steps.',
  },
  {
    id: 'asset-word-sun-tiles',
    title: 'SUN build tiles',
    kind: 'tile',
    category: 'Build pieces',
    value: 'library://tiles/phonics/sun-s-u-n',
    usage: ['word_build'],
    note: 'Word-build tile set authors can point at without inventing ad hoc values.',
  },
  {
    id: 'asset-prompt-oral-check',
    title: 'Oral check prompt card',
    kind: 'prompt-card',
    category: 'Assessment support',
    value: 'library://cards/prompts/oral-check-card-v2',
    usage: ['oral_quiz', 'speak_answer'],
    note: 'Reusable support card for oral checks and guided speaking prompts.',
  },
  {
    id: 'asset-image-goat',
    title: 'Goat choice image',
    kind: 'image',
    category: 'Choice options',
    value: 'library://images/animals/goat-card.webp',
    usage: ['image_choice', 'tap_choice'],
    note: 'One clean distractor/answer option for image-based choices.',
  },
  {
    id: 'asset-image-cow',
    title: 'Cow choice image',
    kind: 'image',
    category: 'Choice options',
    value: 'library://images/animals/cow-card.webp',
    usage: ['image_choice', 'tap_choice'],
    note: 'Pair with goat or market scene prompts for contrast choices.',
  },
];

const assetTemplates: AssetTemplate[] = [
  {
    id: 'template-listen-audio',
    label: 'Add listening audio cue',
    kind: 'audio',
    category: 'Listening cues',
    value: 'library://audio/greetings/hausa-greeting-v1.mp3',
    note: 'Shared audio cue for listen-first steps.',
    appliesTo: ['listen_repeat', 'listen_answer', 'speak_answer'],
    target: 'media',
  },
  {
    id: 'template-letter-trace',
    label: 'Add trace card',
    kind: 'trace-card',
    category: 'Letter intro',
    value: 'library://cards/letters/ba-trace-card.svg',
    note: 'Trace support for letter introduction or sound demo.',
    appliesTo: ['letter_intro'],
    target: 'media',
  },
  {
    id: 'template-word-tiles',
    label: 'Add build tiles',
    kind: 'tile',
    category: 'Build pieces',
    value: 'library://tiles/phonics/sun-s-u-n',
    note: 'Starter tile set for build tasks.',
    appliesTo: ['word_build'],
    target: 'media',
  },
  {
    id: 'template-choice-goat',
    label: 'Insert goat option',
    kind: 'image',
    category: 'Choice options',
    value: 'library://images/animals/goat-card.webp',
    note: 'Image option ready for image/tap choice steps.',
    appliesTo: ['image_choice', 'tap_choice'],
    target: 'choice-media',
    choiceLabel: 'Goat',
    choiceCorrect: true,
  },
  {
    id: 'template-choice-cow',
    label: 'Insert cow option',
    kind: 'image',
    category: 'Choice options',
    value: 'library://images/animals/cow-card.webp',
    note: 'Secondary image option ready for image/tap choice steps.',
    appliesTo: ['image_choice', 'tap_choice'],
    target: 'choice-media',
    choiceLabel: 'Cow',
    choiceCorrect: false,
  },
  {
    id: 'template-oral-prompt',
    label: 'Add oral check prompt card',
    kind: 'prompt-card',
    category: 'Assessment support',
    value: 'library://cards/prompts/oral-check-card-v2',
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

export function LessonAssetLibraryPanel({
  stepType,
  mediaLines,
  choiceLines,
  activitySteps,
  onMediaLinesChange,
  onChoiceLinesChange,
}: {
  stepType: string;
  mediaLines: string;
  choiceLines: string;
  activitySteps: LessonActivityStep[];
  onMediaLinesChange: (value: string) => void;
  onChoiceLinesChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const visibleAssets = useMemo(() => knownAssets.filter((asset) => {
    const matchesStep = asset.usage.includes(stepType);
    const matchesQuery = !normalizedQuery || [asset.title, asset.kind, asset.category, asset.note, asset.value].join(' ').toLowerCase().includes(normalizedQuery);
    return matchesStep && matchesQuery;
  }), [normalizedQuery, stepType]);

  const templatesForStep = useMemo(() => assetTemplates.filter((template) => template.appliesTo.includes(stepType)), [stepType]);

  const registrySummary = useMemo(() => {
    const allMedia = activitySteps.flatMap((step) => step.media ?? []);
    const allChoices = activitySteps.flatMap((step) => step.choices ?? []);
    const linkedValues = [
      ...allMedia.map((item) => String(item.value ?? '')).filter(Boolean),
      ...allChoices.map((item) => String(item.media?.value ?? '')).filter(Boolean),
    ];
    return {
      linkedAssetCount: linkedValues.length,
      uniqueLinkedAssetCount: new Set(linkedValues).size,
      audioCount: allMedia.filter((item) => item.kind === 'audio').length + allChoices.filter((item) => item.media?.kind === 'audio').length,
      imageCount: allMedia.filter((item) => item.kind === 'image').length + allChoices.filter((item) => item.media?.kind === 'image').length,
    };
  }, [activitySteps]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ padding: 16, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B', fontWeight: 800 }}>Asset library lane</div>
            <div style={{ color: '#0f172a', fontWeight: 800, marginTop: 4 }}>Visible registry + quick insert</div>
            <div style={{ color: '#475569', lineHeight: 1.6, marginTop: 6 }}>
              No upload backend yet, so this panel gives authors a safe visible slice now: reusable asset references, quick inserts, and a registry summary wired directly into lesson authoring.
            </div>
          </div>
          <ModalLauncher
            buttonLabel="Open asset picker"
            title="Lesson asset picker"
            eyebrow="Asset library"
            description="Pick a reusable library reference and inject it into this step without hand-writing pipes."
            triggerStyle={{ background: '#0F766E', boxShadow: '0 16px 30px rgba(15, 118, 110, 0.18)' }}
          >
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>
                  Search asset registry
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="audio, goat, prompt card…" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
                </label>
                <div style={{ color: '#64748B', fontSize: 13 }}>Filtered for <strong>{stepType}</strong> so authors only see assets that make sense for the current step.</div>
              </div>

              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                {visibleAssets.length ? visibleAssets.map((asset) => (
                  <div key={asset.id} style={{ padding: 16, borderRadius: 18, background: 'white', border: '1px solid #E2E8F0', display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{asset.title}</div>
                      <span style={{ padding: '5px 9px', borderRadius: 999, background: '#ECFDF5', color: '#166534', fontWeight: 800, fontSize: 12 }}>{asset.kind}</span>
                    </div>
                    <div style={{ color: '#475569', lineHeight: 1.6 }}>{asset.note}</div>
                    <div style={{ color: '#64748B', fontSize: 12 }}>{asset.category}</div>
                    <code style={{ display: 'block', padding: 10, borderRadius: 12, background: '#F8FAFC', color: '#334155', fontSize: 12, overflowWrap: 'anywhere' }}>{asset.value}</code>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => onMediaLinesChange(appendMediaLine(mediaLines, { kind: asset.kind, value: asset.value }))}
                        style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, border: '1px solid #99F6E4', background: '#CCFBF1', color: '#115E59', cursor: 'pointer' }}
                      >
                        Add as shared media
                      </button>
                      {(stepType === 'image_choice' || stepType === 'tap_choice') && asset.kind === 'image' ? (
                        <button
                          type="button"
                          onClick={() => onChoiceLinesChange(appendChoiceMediaLine(choiceLines, { kind: asset.kind, value: asset.value, label: asset.title.replace(/ choice image$/i, ''), isCorrect: false }))}
                          style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#3730A3', cursor: 'pointer' }}
                        >
                          Add as choice option
                        </button>
                      ) : null}
                    </div>
                  </div>
                )) : (
                  <div style={{ gridColumn: '1 / -1', padding: 18, borderRadius: 18, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', lineHeight: 1.6 }}>
                    No asset references match this step yet. That is a registry gap, not an excuse to go back to pipe-editing like a caveperson.
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
            <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.1 }}>Audio refs</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 4 }}>{registrySummary.audioCount}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 14, background: 'white', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.1 }}>Image refs</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#0f172a', marginTop: 4 }}>{registrySummary.imageCount}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {templatesForStep.map((template) => (
            <div key={template.id} style={{ padding: 14, borderRadius: 16, background: 'white', border: '1px solid #E2E8F0', display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{template.label}</div>
                <div style={{ color: '#475569', lineHeight: 1.6, marginTop: 4 }}>{template.note}</div>
              </div>
              <code style={{ display: 'block', padding: 10, borderRadius: 12, background: '#F8FAFC', color: '#334155', fontSize: 12, overflowWrap: 'anywhere' }}>{template.value}</code>
              <button
                type="button"
                onClick={() => {
                  if (template.target === 'media') {
                    onMediaLinesChange(appendMediaLine(mediaLines, { kind: template.kind, value: template.value }));
                    return;
                  }
                  onChoiceLinesChange(appendChoiceMediaLine(choiceLines, {
                    kind: template.kind,
                    value: template.value,
                    label: template.choiceLabel ?? template.label,
                    isCorrect: Boolean(template.choiceCorrect),
                  }));
                }}
                style={{ borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#3730A3', cursor: 'pointer' }}
              >
                Insert into this step
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
