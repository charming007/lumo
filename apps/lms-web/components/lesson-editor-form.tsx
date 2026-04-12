'use client';

import { useMemo, useState } from 'react';
import { ActionButton } from './action-button';
import type { CurriculumModule, Lesson, Subject } from '../lib/types';

const cardStyle = {
  background: 'white',
  borderRadius: 20,
  padding: 24,
  display: 'grid',
  gap: 16,
  border: '1px solid #eef2f7',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
} as const;

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  background: 'white',
  minWidth: 0,
} as const;

const buttonStyle = {
  background: '#4F46E5',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
} as const;

const ghostButtonStyle = {
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 700,
  border: '1px solid #dbe3f0',
  background: 'white',
  color: '#334155',
  cursor: 'pointer',
} as const;

const autoFitTwoUp = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 16,
} as const;

const autoFitFields = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
} as const;

const autoFitCompactFields = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
} as const;

const typeLabelMap: Record<string, string> = {
  listen_repeat: 'Listen & repeat',
  speak_answer: 'Speak answer',
  word_build: 'Word build',
  image_choice: 'Image choice',
  oral_quiz: 'Oral quiz',
  listen_answer: 'Listen answer',
  tap_choice: 'Tap choice',
  letter_intro: 'Letter intro',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14, minWidth: 0 }}>{children}</label>;
}

function safeStringify(value: unknown) {
  return JSON.stringify(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function parseActivityChoices(choiceLines: string) {
  return choiceLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [idRaw, labelRaw, correctnessRaw, mediaKindRaw, mediaValueRaw] = line.split('|').map((part) => part.trim());
      const id = idRaw || `choice-${index + 1}`;
      const label = labelRaw || id;
      const isCorrect = ['correct', 'true', 'yes', '1'].includes((correctnessRaw || '').toLowerCase());
      const mediaKind = mediaKindRaw || '';
      const mediaValue = mediaValueRaw || '';
      return {
        id,
        label,
        isCorrect,
        ...(mediaKind && mediaValue ? { media: { kind: mediaKind, value: mediaValue.includes(',') ? mediaValue.split(',').map((item) => item.trim()).filter(Boolean) : mediaValue } } : {}),
      };
    });
}

function parseActivityMedia(mediaLines: string) {
  return mediaLines
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kindRaw, valueRaw] = line.split('|').map((part) => part.trim());
      const kind = kindRaw || 'image';
      const value = valueRaw || '';
      return {
        kind,
        value: value.includes(',') ? value.split(',').map((item) => item.trim()).filter(Boolean) : value,
      };
    });
}

function makeActivityDraft(index: number) {
  return {
    id: `activity-${Date.now()}-${index + 1}`,
    title: `Activity ${index + 1}`,
    prompt: `Activity ${index + 1}`,
    type: 'speak_answer',
    durationMinutes: '2',
    detail: '',
    evidence: '',
    expectedAnswers: '',
    tags: '',
    facilitatorNotes: '',
    choiceLines: '',
    mediaLines: '',
  };
}

export function LessonEditorForm({
  lesson,
  subjects,
  modules,
  action,
  returnPath = '/content',
}: {
  lesson: Lesson;
  subjects: Subject[];
  modules: CurriculumModule[];
  action: (formData: FormData) => void;
  returnPath?: string;
}) {
  const [subjectId, setSubjectId] = useState(lesson.subjectId ?? (lesson.subjectName ? subjects.find((item) => item.name === lesson.subjectName)?.id ?? subjects[0]?.id ?? '' : subjects[0]?.id ?? ''));
  const [moduleId, setModuleId] = useState(lesson.moduleId ?? modules.find((item) => item.title === lesson.moduleTitle)?.id ?? modules[0]?.id ?? '');
  const [title, setTitle] = useState(lesson.title);
  const [durationMinutes, setDurationMinutes] = useState(String(lesson.durationMinutes));
  const [mode, setMode] = useState(lesson.mode);
  const [status, setStatus] = useState(lesson.status);
  const [targetAgeRange, setTargetAgeRange] = useState(lesson.targetAgeRange ?? '');
  const [voicePersona, setVoicePersona] = useState(lesson.voicePersona ?? '');
  const [learningObjectivesText, setLearningObjectivesText] = useState(asArray<string>(lesson.learningObjectives).join('\n'));
  const [supportLanguage, setSupportLanguage] = useState(String(lesson.localization?.supportLanguage ?? 'ha'));
  const [supportLanguageLabel, setSupportLanguageLabel] = useState(String(lesson.localization?.supportLanguageLabel ?? 'Hausa'));
  const [localizationNotesText, setLocalizationNotesText] = useState(asArray<string>(lesson.localization?.notes).join('\n'));
  const [assessmentTitle, setAssessmentTitle] = useState(String(lesson.lessonAssessment?.title ?? ''));
  const [assessmentKind, setAssessmentKind] = useState(String(lesson.lessonAssessment?.kind ?? 'observational'));
  const [assessmentItemsText, setAssessmentItemsText] = useState(
    asArray<{ prompt?: string; evidence?: string }>(lesson.lessonAssessment?.items)
      .map((item) => `${item.prompt ?? ''}|${item.evidence ?? 'teacher-check'}`)
      .join('\n'),
  );
  const [activityDrafts, setActivityDrafts] = useState(
    asArray<any>(lesson.activitySteps ?? lesson.activities).length > 0
      ? asArray<any>(lesson.activitySteps ?? lesson.activities).map((step, index) => ({
          id: step.id || `activity-${index + 1}`,
          title: step.title ?? step.prompt ?? `Activity ${index + 1}`,
          prompt: step.prompt ?? step.title ?? `Activity ${index + 1}`,
          type: step.type ?? 'speak_answer',
          durationMinutes: String(step.durationMinutes ?? 2),
          detail: step.detail ?? '',
          evidence: step.evidence ?? '',
          expectedAnswers: asArray<string>(step.expectedAnswers).join(', '),
          tags: asArray<string>(step.tags).join(', '),
          facilitatorNotes: asArray<string>(step.facilitatorNotes).join('\n'),
          choiceLines: asArray<{ id?: string; label?: string; isCorrect?: boolean; media?: { kind?: unknown; value?: unknown } | null }>(step.choices).map((choice, choiceIndex) => {
            const mediaKind = choice?.media && typeof choice.media === 'object' && 'kind' in choice.media ? `|${String((choice.media as { kind?: unknown }).kind ?? '')}` : '';
            const mediaValue = choice?.media && typeof choice.media === 'object' && 'value' in choice.media
              ? `|${Array.isArray((choice.media as { value?: unknown }).value) ? ((choice.media as { value: string[] }).value).join(', ') : String((choice.media as { value?: unknown }).value ?? '')}`
              : '';
            return `${choice.id || `choice-${choiceIndex + 1}`}|${choice.label || ''}|${choice.isCorrect ? 'correct' : 'wrong'}${mediaKind}${mediaValue}`;
          }).join('\n'),
          mediaLines: asArray<{ kind?: string; value?: string | string[] | null }>(step.media).map((item) => `${item.kind || 'image'}|${Array.isArray(item.value) ? item.value.join(', ') : String(item.value ?? '')}`).join('\n'),
        }))
      : [makeActivityDraft(0)],
  );

  const filteredModules = useMemo(() => {
    const scoped = modules.filter((module) => module.subjectId === subjectId);
    return scoped.length ? scoped : modules;
  }, [modules, subjectId]);

  const activeModule = filteredModules.find((item) => item.id === moduleId) ?? filteredModules[0] ?? modules[0];
  const readinessCount = useMemo(() => {
    let count = 0;
    if (title.trim().length >= 8) count += 1;
    if ((Number(durationMinutes) || 0) >= 8) count += 1;
    if (activeModule?.status && activeModule.status !== 'draft') count += 1;
    if (assessmentTitle.trim()) count += 1;
    if (status === 'approved' || status === 'published') count += 1;
    return count;
  }, [title, durationMinutes, activeModule?.status, assessmentTitle, status]);

  const learningObjectives = useMemo(
    () => learningObjectivesText.split('\n').map((item) => item.trim()).filter(Boolean),
    [learningObjectivesText],
  );

  const localization = useMemo(
    () => ({
      locale: String(lesson.localization?.locale ?? 'en-NG'),
      supportLanguage,
      supportLanguageLabel,
      notes: localizationNotesText.split('\n').map((item) => item.trim()).filter(Boolean),
    }),
    [lesson.localization?.locale, supportLanguage, supportLanguageLabel, localizationNotesText],
  );

  const lessonAssessment = useMemo(
    () => ({
      title: assessmentTitle,
      kind: assessmentKind,
      items: assessmentItemsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const [prompt, evidence = 'teacher-check'] = line.split('|').map((part) => part.trim());
          return {
            id: `assessment-item-${index + 1}`,
            prompt,
            evidence,
          };
        }),
    }),
    [assessmentTitle, assessmentKind, assessmentItemsText],
  );

  const activitySteps = useMemo(
    () => activityDrafts.map((draft, index) => ({
      id: draft.id || `activity-${index + 1}`,
      order: index + 1,
      type: draft.type,
      title: draft.title,
      prompt: draft.prompt || draft.title,
      durationMinutes: Number(draft.durationMinutes) || 0,
      detail: draft.detail,
      evidence: draft.evidence,
      expectedAnswers: draft.expectedAnswers.split(',').map((item) => item.trim()).filter(Boolean),
      tags: draft.tags.split(',').map((item) => item.trim()).filter(Boolean),
      facilitatorNotes: draft.facilitatorNotes.split('\n').map((item) => item.trim()).filter(Boolean),
      choices: parseActivityChoices(draft.choiceLines),
      media: parseActivityMedia(draft.mediaLines),
    })),
    [activityDrafts],
  );

  const totalActivityMinutes = useMemo(
    () => activitySteps.reduce((sum, step) => sum + (step.durationMinutes || 0), 0),
    [activitySteps],
  );

  const updateActivity = (index: number, patch: Partial<(typeof activityDrafts)[number]>) => {
    setActivityDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const moveActivity = (index: number, direction: -1 | 1) => {
    setActivityDrafts((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const duplicateActivity = (index: number) => {
    setActivityDrafts((current) => {
      const next = [...current];
      const source = current[index];
      next.splice(index + 1, 0, {
        ...source,
        id: `${source.id}-copy-${Date.now()}`,
        title: `${source.title} copy`,
        prompt: `${source.prompt} copy`,
      });
      return next;
    });
  };

  const removeActivity = (index: number) => {
    setActivityDrafts((current) => (current.length === 1 ? [makeActivityDraft(0)] : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const addActivity = () => {
    setActivityDrafts((current) => [...current, makeActivityDraft(current.length)]);
  };

  return (
    <form action={action} style={cardStyle}>
      <input type="hidden" name="lessonId" value={lesson.id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="learningObjectives" value={safeStringify(learningObjectives)} />
      <input type="hidden" name="localization" value={safeStringify(localization)} />
      <input type="hidden" name="lessonAssessment" value={safeStringify(lessonAssessment)} />
      <input type="hidden" name="activitySteps" value={safeStringify(activitySteps)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>Edit lesson authoring pack</h2>
          <div style={{ color: '#64748b', lineHeight: 1.6, marginTop: 8 }}>
            This edits the real payload: objectives, localization, assessment items, and activity steps. Now it also lets authors shape the flow instead of babysitting a dumb JSON blob.
          </div>
        </div>
        <div style={{ minWidth: 180, padding: 16, borderRadius: 18, background: readinessCount >= 5 ? '#DCFCE7' : readinessCount >= 3 ? '#FEF3C7' : '#FEE2E2', color: readinessCount >= 5 ? '#166534' : readinessCount >= 3 ? '#92400E' : '#991B1B', fontWeight: 800 }}>
          {readinessCount}/5 release checks
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Module: {activeModule?.status ?? 'unknown'}</div>
        </div>
      </div>

      <div style={autoFitFields}>
        <FieldLabel>
          Subject
          <select value={subjectId} onChange={(event) => {
            const next = event.target.value;
            setSubjectId(next);
            const nextModules = modules.filter((module) => module.subjectId === next);
            setModuleId(nextModules[0]?.id ?? modules[0]?.id ?? '');
          }} style={inputStyle}>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </FieldLabel>
        <FieldLabel>
          Module
          <select name="moduleId" value={moduleId} onChange={(event) => setModuleId(event.target.value)} style={inputStyle}>
            {filteredModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
          </select>
        </FieldLabel>
        <FieldLabel>
          Duration
          <input name="durationMinutes" type="number" min="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} style={inputStyle} />
        </FieldLabel>
        <FieldLabel>
          Status
          <select name="status" value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}>
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
          </select>
        </FieldLabel>
      </div>

      <div style={autoFitFields}>
        <FieldLabel>
          Lesson title
          <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} />
        </FieldLabel>
        <FieldLabel>
          Delivery mode
          <select name="mode" value={mode} onChange={(event) => setMode(event.target.value)} style={inputStyle}>
            <option value="guided">Guided</option>
            <option value="group">Group</option>
            <option value="independent">Independent</option>
            <option value="practice">Practice</option>
          </select>
        </FieldLabel>
        <FieldLabel>
          Target age
          <input name="targetAgeRange" value={targetAgeRange} onChange={(event) => setTargetAgeRange(event.target.value)} style={inputStyle} />
        </FieldLabel>
      </div>

      <FieldLabel>
        Voice persona
        <input name="voicePersona" value={voicePersona} onChange={(event) => setVoicePersona(event.target.value)} style={inputStyle} />
      </FieldLabel>

      <div style={autoFitTwoUp}>
        <FieldLabel>
          Learning objectives (one per line)
          <textarea value={learningObjectivesText} onChange={(event) => setLearningObjectivesText(event.target.value)} rows={6} style={inputStyle} />
        </FieldLabel>

        <div style={{ padding: 18, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Live learner preview</div>
              <div style={{ color: '#0f172a', fontWeight: 800, marginTop: 4 }}>{title || 'Untitled lesson'}</div>
            </div>
            <div style={{ textAlign: 'right', color: '#475569', fontSize: 13 }}>
              <div>{activitySteps.length} steps</div>
              <div>{totalActivityMinutes} min activity spine</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#E0E7FF', color: '#3730A3', fontWeight: 700, fontSize: 12 }}>{mode}</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#F1F5F9', color: '#334155', fontWeight: 700, fontSize: 12 }}>{targetAgeRange || 'Age band unset'}</span>
            <span style={{ padding: '6px 10px', borderRadius: 999, background: '#EEF2FF', color: '#4338CA', fontWeight: 700, fontSize: 12 }}>{voicePersona || 'Voice persona pending'}</span>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B', marginBottom: 8 }}>Objective snapshot</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', lineHeight: 1.7 }}>
                {learningObjectives.length > 0 ? learningObjectives.map((objective) => <li key={objective}>{objective}</li>) : <li>Add at least one clear objective.</li>}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B', marginBottom: 8 }}>Learner flow</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {activitySteps.map((step, index) => (
                  <div key={step.id} style={{ display: 'grid', gap: 4, padding: 12, borderRadius: 14, background: 'white', border: '1px solid #e2e8f0', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <strong>{index + 1}. {step.title || step.prompt}</strong>
                      <span style={{ color: '#7C3AED', fontWeight: 700 }}>{step.durationMinutes || 0} min</span>
                    </div>
                    <div style={{ color: '#475569', fontSize: 14 }}>{step.detail || step.prompt || 'Add learner-facing guidance for this step.'}</div>
                    <div style={{ color: '#64748B', fontSize: 12 }}>{typeLabelMap[step.type] ?? step.type} • Evidence: {step.evidence || 'Not set yet'}</div>
                    {step.choices && step.choices.length > 0 ? <div style={{ color: '#7C3AED', fontSize: 12, fontWeight: 700 }}>{step.choices.length} choice option{step.choices.length === 1 ? '' : 's'}</div> : null}
                    {step.media && step.media.length > 0 ? <div style={{ color: '#0F766E', fontSize: 12, fontWeight: 700 }}>{step.media.length} media cue{step.media.length === 1 ? '' : 's'}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={autoFitTwoUp}>
        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          <div style={{ padding: 18, borderRadius: 18, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1D4ED8', marginBottom: 10 }}>Localization</div>
            <div style={{ ...autoFitCompactFields, marginBottom: 12 }}>
              <FieldLabel>
                Support language code
                <input value={supportLanguage} onChange={(event) => setSupportLanguage(event.target.value)} style={inputStyle} />
              </FieldLabel>
              <FieldLabel>
                Support language label
                <input value={supportLanguageLabel} onChange={(event) => setSupportLanguageLabel(event.target.value)} style={inputStyle} />
              </FieldLabel>
            </div>
            <FieldLabel>
              Localization notes (one per line)
              <textarea value={localizationNotesText} onChange={(event) => setLocalizationNotesText(event.target.value)} rows={4} style={inputStyle} />
            </FieldLabel>
          </div>

          <div style={{ padding: 18, borderRadius: 18, background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6D28D9', marginBottom: 10 }}>Assessment pack</div>
            <div style={{ ...autoFitCompactFields, marginBottom: 12 }}>
              <FieldLabel>
                Assessment title
                <input value={assessmentTitle} onChange={(event) => setAssessmentTitle(event.target.value)} style={inputStyle} />
              </FieldLabel>
              <FieldLabel>
                Kind
                <select value={assessmentKind} onChange={(event) => setAssessmentKind(event.target.value)} style={inputStyle}>
                  <option value="observational">Observational</option>
                  <option value="oral">Oral</option>
                  <option value="automatic">Automatic</option>
                </select>
              </FieldLabel>
            </div>
            <FieldLabel>
              Assessment items (prompt|evidence per line)
              <textarea value={assessmentItemsText} onChange={(event) => setAssessmentItemsText(event.target.value)} rows={5} style={inputStyle} />
            </FieldLabel>
          </div>
        </div>

        <div style={{ padding: 18, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B' }}>Activity spine</div>
              <div style={{ color: '#475569', marginTop: 4 }}>Add, duplicate, reorder, and trim steps without wrecking the lesson payload.</div>
            </div>
            <button type="button" onClick={addActivity} style={{ ...ghostButtonStyle, background: '#ede9fe', color: '#5b21b6', border: '1px solid #ddd6fe' }}>+ Add step</button>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {activityDrafts.map((activity, index) => (
              <div key={activity.id} style={{ padding: 14, borderRadius: 16, border: '1px solid #E5E7EB', background: 'white', display: 'grid', gap: 10, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Step {index + 1}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => moveActivity(index, -1)} disabled={index === 0} style={{ ...ghostButtonStyle, opacity: index === 0 ? 0.45 : 1 }}>↑ Move</button>
                    <button type="button" onClick={() => moveActivity(index, 1)} disabled={index === activityDrafts.length - 1} style={{ ...ghostButtonStyle, opacity: index === activityDrafts.length - 1 ? 0.45 : 1 }}>↓ Move</button>
                    <button type="button" onClick={() => duplicateActivity(index)} style={ghostButtonStyle}>Duplicate</button>
                    <button type="button" onClick={() => removeActivity(index)} style={{ ...ghostButtonStyle, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>Remove</button>
                  </div>
                </div>
                <div style={autoFitCompactFields}>
                  <FieldLabel>
                    Step title
                    <input value={activity.title} onChange={(event) => updateActivity(index, { title: event.target.value, prompt: event.target.value })} style={inputStyle} />
                  </FieldLabel>
                  <FieldLabel>
                    Type
                    <select value={activity.type} onChange={(event) => updateActivity(index, { type: event.target.value })} style={inputStyle}>
                      <option value="listen_repeat">Listen repeat</option>
                      <option value="speak_answer">Speak answer</option>
                      <option value="word_build">Word build</option>
                      <option value="image_choice">Image choice</option>
                      <option value="oral_quiz">Oral quiz</option>
                      <option value="listen_answer">Listen answer</option>
                      <option value="tap_choice">Tap choice</option>
                      <option value="letter_intro">Letter intro</option>
                    </select>
                  </FieldLabel>
                  <FieldLabel>
                    Minutes
                    <input value={activity.durationMinutes} onChange={(event) => updateActivity(index, { durationMinutes: event.target.value })} style={inputStyle} />
                  </FieldLabel>
                </div>
                <FieldLabel>
                  Learner prompt
                  <textarea value={activity.prompt} onChange={(event) => updateActivity(index, { prompt: event.target.value })} rows={2} style={inputStyle} />
                </FieldLabel>
                <FieldLabel>
                  Detail
                  <textarea value={activity.detail} onChange={(event) => updateActivity(index, { detail: event.target.value })} rows={3} style={inputStyle} />
                </FieldLabel>
                <div style={autoFitCompactFields}>
                  <FieldLabel>
                    Evidence
                    <input value={activity.evidence} onChange={(event) => updateActivity(index, { evidence: event.target.value })} style={inputStyle} />
                  </FieldLabel>
                  <FieldLabel>
                    Expected answers (comma separated)
                    <input value={activity.expectedAnswers} onChange={(event) => updateActivity(index, { expectedAnswers: event.target.value })} style={inputStyle} />
                  </FieldLabel>
                </div>
                <div style={autoFitCompactFields}>
                  <FieldLabel>
                    Tags (comma separated)
                    <input value={activity.tags} onChange={(event) => updateActivity(index, { tags: event.target.value })} style={inputStyle} />
                  </FieldLabel>
                  <FieldLabel>
                    Facilitator notes (one per line)
                    <textarea value={activity.facilitatorNotes} onChange={(event) => updateActivity(index, { facilitatorNotes: event.target.value })} rows={2} style={inputStyle} />
                  </FieldLabel>
                </div>
                <div style={autoFitCompactFields}>
                  <FieldLabel>
                    Choices (id|label|correct/wrong|mediaKind|mediaValue per line)
                    <textarea value={activity.choiceLines} onChange={(event) => updateActivity(index, { choiceLines: event.target.value })} rows={4} style={inputStyle} />
                  </FieldLabel>
                  <FieldLabel>
                    Media cues (kind|value per line)
                    <textarea value={activity.mediaLines} onChange={(event) => updateActivity(index, { mediaLines: event.target.value })} rows={4} style={inputStyle} />
                  </FieldLabel>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ActionButton label="Save full lesson pack" pendingLabel="Saving lesson pack…" style={buttonStyle} />
    </form>
  );
}
