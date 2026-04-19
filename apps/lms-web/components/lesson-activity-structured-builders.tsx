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
  gap: 12,
  gridTemplateColumns: 'minmax(120px, 0.85fr) minmax(140px, 1.1fr) minmax(110px, 0.75fr) minmax(150px, 0.95fr) minmax(260px, 1.8fr) auto',
  alignItems: 'start',
};
const mediaRowStyle: StyleObject = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'minmax(150px, 0.9fr) minmax(300px, 1.9fr) auto',
  alignItems: 'start',
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
const attachmentCardStyle: StyleObject = {
  border: '1px solid #D7E0EA',
  borderRadius: 14,
  background: '#FFFFFF',
  padding: 12,
  display: 'grid',
  gap: 10,
  minWidth: 0,
};
const previewFrameStyle: StyleObject = {
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  background: '#F8FAFC',
  minHeight: 104,
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
};
const previewImageStyle: StyleObject = {
  width: '100%',
  maxHeight: 180,
  objectFit: 'cover',
  display: 'block',
};
const pillStyle: StyleObject = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 9px',
  borderRadius: 999,
  background: '#EEF2FF',
  color: '#3730A3',
  fontSize: 11,
  fontWeight: 800,
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

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function isLikelyImageUrl(value: string) {
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value.trim());
}

function isLikelyAudioUrl(value: string) {
  return /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(value.trim());
}

function getMediaKindGuidance(kind: string) {
  switch (normalizeLessonAssetKind(kind)) {
    case 'image':
    case 'illustration':
    case 'prompt-card':
    case 'story-card':
    case 'trace-card':
    case 'letter-card':
    case 'tile':
    case 'word-card':
      return 'Paste an image URL, CDN path, or asset key. Visual kinds show a thumbnail when the value is a direct image URL.';
    case 'audio':
      return 'Paste an audio URL, storage path, or asset key. Direct audio URLs get an inline player.';
    case 'hint':
    case 'transcript':
      return 'Use a short text value, transcript ref, or asset key.';
    default:
      return 'Paste a URL, asset key, or storage path.';
  }
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

function renderAttachmentPreview(kind: string, value: string, label: string) {
  const normalizedKind = normalizeLessonAssetKind(kind);
  const trimmedValue = value.trim();
  const canPreviewImage = trimmedValue && isLikelyUrl(trimmedValue) && (isLikelyImageUrl(trimmedValue) || normalizedKind !== 'audio');
  const canPreviewAudio = trimmedValue && isLikelyUrl(trimmedValue) && (normalizedKind === 'audio' || isLikelyAudioUrl(trimmedValue));

  return (
    <div style={attachmentCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={pillStyle}>{getLessonAssetKindLabel(normalizedKind)}</span>
        {trimmedValue ? (
          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>{isLikelyUrl(trimmedValue) ? 'Direct URL detected' : 'Asset key / path'}</span>
        ) : null}
      </div>
      <div style={previewFrameStyle}>
        {!trimmedValue ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>
            Add a value to see the attachment card populate.
          </div>
        ) : canPreviewAudio ? (
          <div style={{ width: '100%', padding: 12, display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#334155', fontWeight: 700 }}>{label}</div>
            <audio controls preload="none" style={{ width: '100%' }} src={trimmedValue} />
          </div>
        ) : canPreviewImage ? (
          <img src={trimmedValue} alt={label} style={previewImageStyle} />
        ) : (
          <div style={{ padding: 16, width: '100%', display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#334155', fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              No inline thumbnail available for this value. Runtime can still use asset keys, storage paths, or non-direct URLs.
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 }}>Attached value</div>
        <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{trimmedValue || 'Not set yet'}</div>
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
            {choiceRows.map((row, index) => {
              const effectiveKind = row.mediaKind || (builderType === 'image_choice' ? 'image' : '');
              const previewLabel = row.label.trim() || row.id.trim() || `Choice ${index + 1}`;
              return (
                <div key={`${row.id}-${index}`} style={{ ...cardStyle, background: '#FFFFFF' }}>
                  <div style={rowStyle}>
                    {props.fieldLabel(<><span>Choice ID</span><input value={row.id} onChange={(event) => updateChoiceRow(index, { id: event.target.value })} style={props.inputStyle} placeholder={`choice-${index + 1}`} /></>)}
                    {props.fieldLabel(<><span>{choiceLabels.labelName}</span><input value={row.label} onChange={(event) => updateChoiceRow(index, { label: event.target.value })} style={props.inputStyle} placeholder="Visible label" /></>)}
                    {props.fieldLabel(<><span>Correct?</span><select value={row.isCorrect ? 'correct' : 'wrong'} onChange={(event) => updateChoiceRow(index, { isCorrect: event.target.value === 'correct' })} style={props.inputStyle}><option value="wrong">Wrong</option><option value="correct">Correct</option></select></>)}
                    {props.fieldLabel(<><span>Media kind</span><select value={row.mediaKind} onChange={(event) => updateChoiceRow(index, { mediaKind: event.target.value })} style={props.inputStyle}><option value="">No asset</option>{knownLessonAssetKinds.map((kind) => <option key={kind} value={kind}>{getLessonAssetKindLabel(kind)}</option>)}</select></>)}
                    {props.fieldLabel(
                      <>
                        <span>Attachment value</span>
                        <textarea
                          value={row.mediaValue}
                          onChange={(event) => updateChoiceRow(index, { mediaValue: event.target.value })}
                          style={{ ...props.inputStyle, minHeight: 92, resize: 'vertical' }}
                          placeholder={choiceLabels.mediaHint}
                        />
                      </>
                    )}
                    <button type="button" onClick={() => removeChoiceRow(index)} style={{ ...props.ghostButtonStyle, alignSelf: 'stretch' }}>Remove</button>
                  </div>
                  {row.mediaKind ? (
                    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1fr)' }}>
                      {renderAttachmentPreview(effectiveKind, row.mediaValue, previewLabel)}
                      <div style={attachmentCardStyle}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>Attachment guidance</div>
                        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{getMediaKindGuidance(effectiveKind)}</div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 }}>Visible label</div>
                          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{previewLabel}</div>
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 }}>Recommended entry</div>
                          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                            {isLikelyUrl(row.mediaValue) ? 'Looks like a direct URL. Preview should match runtime closely.' : 'This looks like an asset key or storage path. That is fine — preview falls back to metadata when it cannot render the file inline.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={addChoiceRow} style={props.ghostButtonStyle}>+ Add row</button>
          </div>
          {props.fieldHint('Each choice now gets a real attachment card with media-kind controls and preview behavior instead of raw pipe-delimited mediaValue entry.')}
        </div>
      ) : null}

      {supportsMedia ? (
        <div style={cardStyle}>
          {props.sectionLabel}
          <div style={{ fontWeight: 700, color: '#1E293B' }}>{mediaLabels.title}</div>
          <div style={compactNoteStyle}>{mediaLabels.hint}</div>
          <div style={stackStyle}>
            {mediaRows.map((row, index) => (
              <div key={`${row.kind}-${index}`} style={{ ...cardStyle, background: '#FFFFFF' }}>
                <div style={mediaRowStyle}>
                  {props.fieldLabel(<><span>Kind</span><select value={row.kind} onChange={(event) => updateMediaRow(index, { kind: event.target.value })} style={props.inputStyle}>{knownLessonAssetKinds.map((kind) => <option key={kind} value={kind}>{getLessonAssetKindLabel(kind)}</option>)}</select></>)}
                  {props.fieldLabel(
                    <>
                      <span>Attachment value</span>
                      <textarea
                        value={row.value}
                        onChange={(event) => updateMediaRow(index, { value: event.target.value })}
                        style={{ ...props.inputStyle, minHeight: 92, resize: 'vertical' }}
                        placeholder="Paste a direct URL, asset key, storage path, or transcript ref"
                      />
                    </>
                  )}
                  <button type="button" onClick={() => removeMediaRow(index)} style={{ ...props.ghostButtonStyle, alignSelf: 'stretch' }}>Remove</button>
                </div>
                <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1fr)' }}>
                  {renderAttachmentPreview(row.kind, row.value, `${getLessonAssetKindLabel(row.kind)} ${index + 1}`)}
                  <div style={attachmentCardStyle}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>Attachment guidance</div>
                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{getMediaKindGuidance(row.kind)}</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 }}>Authoring note</div>
                      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                        {row.kind === 'audio' ? 'Use direct audio URLs when possible so reviewers can hear the cue inline before saving.' : 'Visual and support assets can use direct URLs for preview or stable asset keys when files live outside the LMS app.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={addMediaRow} style={props.ghostButtonStyle}>+ Add media</button>
          </div>
          {props.fieldHint('Shared lesson media now renders as attachment cards with clear media-kind controls, URL/path-safe entry, and preview support where the browser can actually render it.')}
        </div>
      ) : null}
    </div>
  );
}
