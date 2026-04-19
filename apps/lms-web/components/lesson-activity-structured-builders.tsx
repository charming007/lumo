'use client';

import React from 'react';

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
  gridTemplateColumns: 'minmax(120px, 0.9fr) minmax(140px, 1.2fr) minmax(110px, 0.8fr) minmax(120px, 0.8fr) minmax(180px, 1.4fr) auto',
  alignItems: 'end',
};
const mediaRowStyle: StyleObject = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'minmax(140px, 0.9fr) minmax(220px, 1.8fr) auto',
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
        mediaKind: mediaKindRaw || '',
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
        kind: kindRaw || 'image',
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
        title: 'Choice builder',
        hint: 'Add one card per image option. Mark the right answer and attach per-option image media when needed.',
        labelName: 'Visible label',
        mediaHint: 'Usually image URL, asset key, or storage path.',
      };
    case 'tap_choice':
      return {
        title: 'Tap target builder',
        hint: 'Add clean tap targets with short labels. Mark the right tap explicitly.',
        labelName: 'Tap label',
        mediaHint: 'Optional image/audio tied to this tap target.',
      };
    case 'word_build':
      return {
        title: 'Build piece builder',
        hint: 'Add the letters, chunks, or word pieces learners use. Mark the pieces that belong in the final build.',
        labelName: 'Piece label',
        mediaHint: 'Optional tile art, audio cue, or card reference.',
      };
    default:
      return {
        title: 'Choice builder',
        hint: 'Add structured choice rows instead of editing pipe-delimited text.',
        labelName: 'Label',
        mediaHint: 'Optional media value for this row.',
      };
  }
}

function getMediaLabels(type: BuilderType) {
  switch (type) {
    case 'listen_repeat':
      return {
        title: 'Listen cue builder',
        hint: 'Attach the audio, image, or support cue learners hear/see before repeating.',
      };
    case 'speak_answer':
      return {
        title: 'Speaking support builder',
        hint: 'Add any prompt card, image cue, or audio support that sets up the spoken response.',
      };
    case 'listen_answer':
      return {
        title: 'Listening support builder',
        hint: 'Add the audio, story card, or listening prompt learners need before they answer.',
      };
    case 'letter_intro':
      return {
        title: 'Letter support builder',
        hint: 'Add the letter card, sound clip, or tracing reference used during the intro.',
      };
    case 'image_choice':
      return {
        title: 'Shared media builder',
        hint: 'Optional prompt-level media shown above all image options.',
      };
    case 'tap_choice':
      return {
        title: 'Shared media builder',
        hint: 'Optional shared media shown before learners tap an answer.',
      };
    case 'word_build':
      return {
        title: 'Build support builder',
        hint: 'Optional sound cue, target card, or teacher-facing media for the build.',
      };
    default:
      return {
        title: 'Media builder',
        hint: 'Add structured media rows instead of editing raw pipe-delimited text.',
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
    const defaultKind = builderType === 'listen_repeat' ? 'audio' : builderType === 'letter_intro' ? 'image' : 'image';
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
          <div style={{ fontWeight: 700, color: '#1E293B' }}>{choiceLabels.title}</div>
          <div style={compactNoteStyle}>{choiceLabels.hint}</div>
          <div style={stackStyle}>
            {choiceRows.map((row, index) => (
              <div key={`${row.id}-${index}`} style={rowStyle}>
                {props.fieldLabel(<><span>Choice ID</span><input value={row.id} onChange={(event) => updateChoiceRow(index, { id: event.target.value })} style={props.inputStyle} placeholder={`choice-${index + 1}`} /></>)}
                {props.fieldLabel(<><span>{choiceLabels.labelName}</span><input value={row.label} onChange={(event) => updateChoiceRow(index, { label: event.target.value })} style={props.inputStyle} placeholder="Visible label" /></>)}
                {props.fieldLabel(<><span>Correct?</span><select value={row.isCorrect ? 'correct' : 'wrong'} onChange={(event) => updateChoiceRow(index, { isCorrect: event.target.value === 'correct' })} style={props.inputStyle}><option value="wrong">Wrong</option><option value="correct">Correct</option></select></>)}
                {props.fieldLabel(<><span>Media kind</span><input value={row.mediaKind} onChange={(event) => updateChoiceRow(index, { mediaKind: event.target.value })} style={props.inputStyle} placeholder={builderType === 'image_choice' ? 'image' : 'audio / image'} /></>)}
                {props.fieldLabel(<><span>Media value</span><input value={row.mediaValue} onChange={(event) => updateChoiceRow(index, { mediaValue: event.target.value })} style={props.inputStyle} placeholder={choiceLabels.mediaHint} /></>)}
                <button type="button" onClick={() => removeChoiceRow(index)} style={{ ...props.ghostButtonStyle, alignSelf: 'stretch' }}>Remove</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={addChoiceRow} style={props.ghostButtonStyle}>+ Add row</button>
          </div>
          {props.fieldHint('The form still stores these rows in the same lesson payload shape — you just no longer have to hand-write pipes like a maniac.')}
        </div>
      ) : null}

      {supportsMedia ? (
        <div style={cardStyle}>
          {props.sectionLabel}
          <div style={{ fontWeight: 700, color: '#1E293B' }}>{mediaLabels.title}</div>
          <div style={compactNoteStyle}>{mediaLabels.hint}</div>
          <div style={stackStyle}>
            {mediaRows.map((row, index) => (
              <div key={`${row.kind}-${index}`} style={mediaRowStyle}>
                {props.fieldLabel(<><span>Kind</span><input value={row.kind} onChange={(event) => updateMediaRow(index, { kind: event.target.value })} style={props.inputStyle} placeholder="image / audio / prompt-card" /></>)}
                {props.fieldLabel(<><span>Value</span><input value={row.value} onChange={(event) => updateMediaRow(index, { value: event.target.value })} style={props.inputStyle} placeholder="URL, asset key, or comma-separated values" /></>)}
                <button type="button" onClick={() => removeMediaRow(index)} style={{ ...props.ghostButtonStyle, alignSelf: 'stretch' }}>Remove</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={addMediaRow} style={props.ghostButtonStyle}>+ Add media</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
