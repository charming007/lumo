'use client';

import React from 'react';
import {
  getLessonAssetKindLabel,
  getLessonAssetPreviewTone,
  getLessonAssetRuntimeReadiness,
  knownLessonAssetKinds,
  normalizeLessonAssetKind,
} from '../lib/lesson-runtime-preview';

type BuilderType = 'image_choice' | 'tap_choice' | 'word_build' | 'listen_repeat' | 'speak_answer' | 'letter_intro' | 'listen_answer';

type ChoiceRow = {
  id: string;
  label: string;
  isCorrect: boolean;
  mediaKind: string;
  mediaValue: string;
};

type MediaRow = {
  kind: string;
  value: string;
};

type StyleObject = React.CSSProperties;

type Props = {
  type: string;
  choiceLines: string;
  mediaLines: string;
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

function getChoiceLabels(type: BuilderType) {
  switch (type) {
    case 'image_choice':
      return {
        title: 'Visual option builder',
        hint: 'Build the learner-facing answer cards here. Add the option label, mark the right answer, then attach the image or prompt asset that makes the choice real.',
        labelName: 'Option label',
        mediaTypeLabel: 'Visual asset type',
        mediaValueLabel: 'Image file, URL, or asset key',
        mediaPlaceholder: 'For example: nurse-card, https://..., or storage/path/image.webp',
        emptyState: 'No visual options yet. Add at least two cards so this stops pretending to be an image task and starts acting like one.',
      };
    case 'tap_choice':
      return {
        title: 'Tap target builder',
        hint: 'Create the tappable learner targets instead of editing raw transport strings. Keep labels short, then attach an optional support asset when the target is visual or audio-led.',
        labelName: 'Tap target label',
        mediaTypeLabel: 'Support asset type',
        mediaValueLabel: 'Support asset file, URL, or key',
        mediaPlaceholder: 'Optional image/audio reference for this tap target',
        emptyState: 'No tap targets yet. Add at least two targets so the learner has an actual decision to make.',
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

function getMediaLabels(type: BuilderType) {
  switch (type) {
    case 'listen_repeat':
      return {
        title: 'Listening asset builder',
        hint: 'Attach the model audio, prompt card, or support cue learners hear or see before they repeat.',
        typeLabel: 'Listening asset type',
        valueLabel: 'Listening asset file, URL, or key',
        placeholder: 'Audio file, transcript card key, or support image reference',
        emptyState: 'No listening asset attached yet. Add the cue learners repeat from so the step is not doing audio theatre with plain text.',
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

function ChoiceAttachmentCard({
  row,
  index,
  choiceLabels,
  onChange,
  onRemove,
  onUseExample,
}: {
  row: ChoiceRow;
  index: number;
  choiceLabels: ReturnType<typeof getChoiceLabels>;
  onChange: (patch: Partial<ChoiceRow>) => void;
  onRemove: () => void;
  onUseExample: (value: string) => void;
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
          {row.mediaKind ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {getAssetExamples(row.mediaKind).map((example) => (
                <button key={example} type="button" onClick={() => onUseExample(example)} style={{ ...miniInputStyle, width: 'auto', cursor: 'pointer', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#4338CA', background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                  Use {example}
                </button>
              ))}
            </div>
          ) : null}
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
}: {
  row: MediaRow;
  index: number;
  mediaLabels: ReturnType<typeof getMediaLabels>;
  onChange: (patch: Partial<MediaRow>) => void;
  onRemove: () => void;
  onUseExample: (value: string) => void;
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

export function LessonActivityStructuredBuilders(props: Props) {
  const builderType = props.type as BuilderType;
  const supportsChoices = builderType === 'image_choice' || builderType === 'tap_choice' || builderType === 'word_build';
  const supportsMedia = supportsChoices || builderType === 'listen_repeat' || builderType === 'listen_answer' || builderType === 'speak_answer' || builderType === 'letter_intro';

  if (!supportsChoices && !supportsMedia) return null;

  const choiceRows = parseChoiceLines(props.choiceLines);
  const mediaRows = parseMediaLines(props.mediaLines);
  const choiceLabels = getChoiceLabels(builderType);
  const mediaLabels = getMediaLabels(builderType);
  const attachedChoiceCount = choiceRows.filter((row) => row.mediaKind && row.mediaValue.trim()).length;
  const readyMediaCount = mediaRows.filter((row) => row.value.trim()).length;

  const updateChoiceRows = (updater: (rows: ChoiceRow[]) => ChoiceRow[]) => {
    props.onChoiceLinesChange(serializeChoiceLines(updater(choiceRows)));
  };
  const updateMediaRows = (updater: (rows: MediaRow[]) => MediaRow[]) => {
    props.onMediaLinesChange(serializeMediaLines(updater(mediaRows)));
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {supportsChoices ? (
        <div style={cardStyle}>
          {props.sectionLabel}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1E293B' }}>{choiceLabels.title}</div>
              <span style={helperPillStyle}>{choiceRows.length} option{choiceRows.length === 1 ? '' : 's'}</span>
              <span style={{ ...helperPillStyle, background: attachedChoiceCount ? '#DCFCE7' : '#F8FAFC', color: attachedChoiceCount ? '#166534' : '#475569' }}>
                {attachedChoiceCount}/{choiceRows.length || 0} with attachments
              </span>
            </div>
          </div>
          <div style={compactNoteStyle}>{choiceLabels.hint}</div>
          <div style={{ padding: 12, borderRadius: 14, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
            Attachment cards now preview what runtime should render. Pick a kind first, then paste a real file path, asset key, URL, or short cue text — no backend media library required.
          </div>
          {choiceRows.length ? (
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
                />
              ))}
            </div>
          ) : (
            <div style={emptyStateStyle}>{choiceLabels.emptyState}</div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => updateChoiceRows((rows) => [...rows, { id: `choice-${rows.length + 1}`, label: '', isCorrect: false, mediaKind: builderType === 'image_choice' ? 'image' : '', mediaValue: '' }])} style={props.ghostButtonStyle}>+ Add option</button>
          </div>
          {props.fieldHint('Use attachments when the learner needs to see, hear, or tap something concrete. Leave them blank only when the step is intentionally text-led.')}
        </div>
      ) : null}

      {supportsMedia ? (
        <div style={cardStyle}>
          {props.sectionLabel}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1E293B' }}>{mediaLabels.title}</div>
              <span style={helperPillStyle}>{mediaRows.length} asset{mediaRows.length === 1 ? '' : 's'}</span>
              <span style={{ ...helperPillStyle, background: readyMediaCount ? '#DCFCE7' : '#F8FAFC', color: readyMediaCount ? '#166534' : '#475569' }}>
                {readyMediaCount}/{mediaRows.length || 0} runtime-ready
              </span>
            </div>
          </div>
          <div style={compactNoteStyle}>{mediaLabels.hint}</div>
          {mediaRows.length ? (
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
                />
              ))}
            </div>
          ) : (
            <div style={emptyStateStyle}>{mediaLabels.emptyState}</div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => updateMediaRows((rows) => [...rows, { kind: builderType === 'listen_repeat' ? 'audio' : builderType === 'letter_intro' ? 'letter-card' : builderType === 'word_build' ? 'word-card' : 'image', value: '' }])} style={props.ghostButtonStyle}>+ Add asset</button>
          </div>
          {props.fieldHint('Shared assets are the top-of-step cue: scene art, audio model, transcript, prompt card, or build anchor. Keep them explicit so the preview is honest.')}
        </div>
      ) : null}
    </div>
  );
}
