'use client';

import React from 'react';
import {
  getLessonAssetKindLabel,
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
const rowStyle: StyleObject = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(140px, 1.2fr) minmax(110px, 0.8fr) minmax(140px, 0.9fr) minmax(220px, 1.5fr) auto',
  alignItems: 'end',
};
const mediaRowStyle: StyleObject = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'minmax(160px, 1fr) minmax(260px, 1.8fr) auto',
  alignItems: 'end',
};
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
        mediaValueLabel: 'Image reference',
        mediaPlaceholder: 'Paste a URL, storage path, or stable asset key (uploads are not in this form yet)',
        emptyState: 'No visual options yet. Add at least two cards so this stops pretending to be an image task and starts acting like one.',
      };
    case 'tap_choice':
      return {
        title: 'Tap target builder',
        hint: 'Create the tappable learner targets instead of editing raw transport strings. Keep labels short, then attach an optional support asset when the target is visual or audio-led.',
        labelName: 'Tap target label',
        mediaTypeLabel: 'Support asset type',
        mediaValueLabel: 'Support asset reference',
        mediaPlaceholder: 'Optional URL, storage path, or stable asset key for this tap target',
        emptyState: 'No tap targets yet. Add at least two targets so the learner has an actual decision to make.',
      };
    case 'word_build':
      return {
        title: 'Build piece builder',
        hint: 'Add the tiles, chunks, or word pieces learners manipulate. Attach card art or audio only when it genuinely helps the build.',
        labelName: 'Piece label',
        mediaTypeLabel: 'Piece asset type',
        mediaValueLabel: 'Piece asset reference',
        mediaPlaceholder: 'Optional URL, storage path, card key, or audio cue reference',
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
        valueLabel: 'Listening asset reference',
        placeholder: 'Audio URL, storage path, transcript key, or support image reference',
        emptyState: 'No listening asset attached yet. Add the cue learners repeat from so the step is not doing audio theatre with plain text.',
      };
    case 'speak_answer':
      return {
        title: 'Speaking support builder',
        hint: 'Attach the prompt card, illustration, or audio cue that helps the learner answer out loud.',
        typeLabel: 'Speaking support type',
        valueLabel: 'Support asset reference',
        placeholder: 'Prompt-card key, URL, storage path, image, or audio reference',
        emptyState: 'No speaking support attached yet. That is fine for a text-led oral prompt, but add one if the step depends on a visible cue.',
      };
    case 'listen_answer':
      return {
        title: 'Listening support builder',
        hint: 'Attach the audio, story card, or scene support learners need before answering.',
        typeLabel: 'Listening support type',
        valueLabel: 'Support asset reference',
        placeholder: 'Audio URL, story-card key, storage path, or visual cue reference',
        emptyState: 'No listening support attached yet. Add the story/audio cue if the answer depends on hearing something first.',
      };
    case 'letter_intro':
      return {
        title: 'Letter support builder',
        hint: 'Attach the letter card, trace card, anchor image, or sound cue used during the introduction.',
        typeLabel: 'Letter support type',
        valueLabel: 'Letter asset reference',
        placeholder: 'Trace-card key, letter-card key, URL, storage path, image, or audio reference',
        emptyState: 'No letter support attached yet. Add the card or cue that makes the letter intro visible to the learner.',
      };
    case 'image_choice':
      return {
        title: 'Shared prompt asset builder',
        hint: 'Optional step-level media shown above all answer cards, such as the scene image or spoken instruction cue.',
        typeLabel: 'Prompt asset type',
        valueLabel: 'Prompt asset reference',
        placeholder: 'Shared scene URL, storage path, prompt-card key, or instruction audio reference',
        emptyState: 'No shared prompt asset yet. That is optional if all the visual meaning already lives on the answer cards.',
      };
    case 'tap_choice':
      return {
        title: 'Shared prompt asset builder',
        hint: 'Optional shared asset shown before learners tap a target.',
        typeLabel: 'Prompt asset type',
        valueLabel: 'Prompt asset reference',
        placeholder: 'Shared image/audio URL, storage path, or prompt-card key',
        emptyState: 'No shared prompt asset yet. Add one only if learners need a common cue before tapping.',
      };
    case 'word_build':
      return {
        title: 'Build support builder',
        hint: 'Attach the target card, audio model, or extra support asset used to guide the build.',
        typeLabel: 'Build support type',
        valueLabel: 'Support asset reference',
        placeholder: 'Word-card key, tile art URL/storage path, or audio reference',
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

export function LessonActivityStructuredBuilders(props: Props) {
  const builderType = props.type as BuilderType;
  const supportsChoices = builderType === 'image_choice' || builderType === 'tap_choice' || builderType === 'word_build';
  const supportsMedia = supportsChoices || builderType === 'listen_repeat' || builderType === 'listen_answer' || builderType === 'speak_answer' || builderType === 'letter_intro';

  if (!supportsChoices && !supportsMedia) return null;

  const choiceRows = parseChoiceLines(props.choiceLines);
  const mediaRows = parseMediaLines(props.mediaLines);
  const choiceLabels = getChoiceLabels(builderType);
  const mediaLabels = getMediaLabels(builderType);

  const updateChoiceRow = (index: number, patch: Partial<ChoiceRow>) => {
    const next = [...choiceRows];
    next[index] = { ...next[index], ...patch };
    props.onChoiceLinesChange(serializeChoiceLines(next));
  };

  const addChoiceRow = () => {
    const next = [...choiceRows, { id: `choice-${choiceRows.length + 1}`, label: '', isCorrect: false, mediaKind: builderType === 'image_choice' ? 'image' : '', mediaValue: '' }];
    props.onChoiceLinesChange(serializeChoiceLines(next));
  };

  const removeChoiceRow = (index: number) => {
    const next = choiceRows.filter((_, rowIndex) => rowIndex !== index);
    props.onChoiceLinesChange(serializeChoiceLines(next));
  };

  const updateMediaRow = (index: number, patch: Partial<MediaRow>) => {
    const next = [...mediaRows];
    next[index] = { ...next[index], ...patch };
    props.onMediaLinesChange(serializeMediaLines(next));
  };

  const addMediaRow = () => {
    const defaultKind = builderType === 'listen_repeat' ? 'audio' : builderType === 'letter_intro' ? 'letter-card' : builderType === 'word_build' ? 'word-card' : 'image';
    const next = [...mediaRows, { kind: defaultKind, value: '' }];
    props.onMediaLinesChange(serializeMediaLines(next));
  };

  const removeMediaRow = (index: number) => {
    const next = mediaRows.filter((_, rowIndex) => rowIndex !== index);
    props.onMediaLinesChange(serializeMediaLines(next));
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {supportsChoices ? (
        <div style={cardStyle}>
          {props.sectionLabel}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#1E293B' }}>{choiceLabels.title}</div>
            <span style={helperPillStyle}>{choiceRows.length} option{choiceRows.length === 1 ? '' : 's'}</span>
          </div>
          <div style={compactNoteStyle}>{choiceLabels.hint}</div>
          {choiceRows.length ? (
            <div style={stackStyle}>
              {choiceRows.map((row, index) => (
                <div key={`${row.id}-${index}`} style={rowStyle}>
                  {props.fieldLabel(<><span>Option ID</span><input value={row.id} onChange={(event) => updateChoiceRow(index, { id: event.target.value })} style={props.inputStyle} placeholder={`choice-${index + 1}`} /></>)}
                  {props.fieldLabel(<><span>{choiceLabels.labelName}</span><input value={row.label} onChange={(event) => updateChoiceRow(index, { label: event.target.value })} style={props.inputStyle} placeholder="What the learner sees" /></>)}
                  {props.fieldLabel(<><span>Answer status</span><select value={row.isCorrect ? 'correct' : 'wrong'} onChange={(event) => updateChoiceRow(index, { isCorrect: event.target.value === 'correct' })} style={props.inputStyle}><option value="wrong">Distractor</option><option value="correct">Correct answer</option></select></>)}
                  {props.fieldLabel(<><span>{choiceLabels.mediaTypeLabel}</span><select value={row.mediaKind} onChange={(event) => updateChoiceRow(index, { mediaKind: event.target.value })} style={props.inputStyle}><option value="">No attached asset</option>{knownLessonAssetKinds.map((kind) => <option key={kind} value={kind}>{getLessonAssetKindLabel(kind)}</option>)}</select></>)}
                  {props.fieldLabel(<><span>{choiceLabels.mediaValueLabel}</span><input value={row.mediaValue} onChange={(event) => updateChoiceRow(index, { mediaValue: event.target.value })} style={props.inputStyle} placeholder={choiceLabels.mediaPlaceholder} /></>)}
                  <button type="button" onClick={() => removeChoiceRow(index)} style={{ ...props.ghostButtonStyle, alignSelf: 'stretch' }}>Remove</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyStateStyle}>{choiceLabels.emptyState}</div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={addChoiceRow} style={props.ghostButtonStyle}>+ Add option</button>
          </div>
          {props.fieldHint('Pick the closest real asset type so authoring, runtime preview, and delivery all agree on what learners should actually see or hear.')}
          {props.fieldHint('These fields store references only: paste a stable URL, storage path, or agreed asset key. This editor does not upload or browse media yet.')}
        </div>
      ) : null}

      {supportsMedia ? (
        <div style={cardStyle}>
          {props.sectionLabel}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: '#1E293B' }}>{mediaLabels.title}</div>
            <span style={helperPillStyle}>{mediaRows.length} asset{mediaRows.length === 1 ? '' : 's'}</span>
          </div>
          <div style={compactNoteStyle}>{mediaLabels.hint}</div>
          {mediaRows.length ? (
            <div style={stackStyle}>
              {mediaRows.map((row, index) => (
                <div key={`${row.kind}-${index}`} style={mediaRowStyle}>
                  {props.fieldLabel(<><span>{mediaLabels.typeLabel}</span><select value={row.kind} onChange={(event) => updateMediaRow(index, { kind: event.target.value })} style={props.inputStyle}>{knownLessonAssetKinds.map((kind) => <option key={kind} value={kind}>{getLessonAssetKindLabel(kind)}</option>)}</select></>)}
                  {props.fieldLabel(<><span>{mediaLabels.valueLabel}</span><input value={row.value} onChange={(event) => updateMediaRow(index, { value: event.target.value })} style={props.inputStyle} placeholder={mediaLabels.placeholder} /></>)}
                  <button type="button" onClick={() => removeMediaRow(index)} style={{ ...props.ghostButtonStyle, alignSelf: 'stretch' }}>Remove</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyStateStyle}>{mediaLabels.emptyState}</div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={addMediaRow} style={props.ghostButtonStyle}>+ Add asset</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
