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
} as const;

const buttonStyle = {
  background: '#4F46E5',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
} as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{children}</label>;
}

function safeStringify(value: unknown) {
  return JSON.stringify(value);
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
  const [subjectId, setSubjectId] = useState(lesson.subjectName ? subjects.find((item) => item.name === lesson.subjectName)?.id ?? subjects[0]?.id ?? '' : subjects[0]?.id ?? '');
  const [moduleId, setModuleId] = useState(modules.find((item) => item.title === lesson.moduleTitle)?.id ?? modules[0]?.id ?? '');
  const [title, setTitle] = useState(lesson.title);
  const [durationMinutes, setDurationMinutes] = useState(String(lesson.durationMinutes));
  const [mode, setMode] = useState(lesson.mode);
  const [status, setStatus] = useState(lesson.status);
  const [targetAgeRange, setTargetAgeRange] = useState(lesson.targetAgeRange ?? '');
  const [voicePersona, setVoicePersona] = useState(lesson.voicePersona ?? '');
  const [learningObjectivesText, setLearningObjectivesText] = useState((lesson.learningObjectives ?? []).join('\n'));
  const [supportLanguage, setSupportLanguage] = useState(String(lesson.localization?.supportLanguage ?? 'ha'));
  const [supportLanguageLabel, setSupportLanguageLabel] = useState(String(lesson.localization?.supportLanguageLabel ?? 'Hausa'));
  const [localizationNotesText, setLocalizationNotesText] = useState(Array.isArray(lesson.localization?.notes) ? (lesson.localization?.notes as string[]).join('\n') : '');
  const [assessmentTitle, setAssessmentTitle] = useState(String(lesson.lessonAssessment?.title ?? ''));
  const [assessmentKind, setAssessmentKind] = useState(String(lesson.lessonAssessment?.kind ?? 'observational'));
  const [assessmentItemsText, setAssessmentItemsText] = useState(
    (lesson.lessonAssessment?.items ?? [])
      .map((item) => `${item.prompt}|${item.evidence ?? 'teacher-check'}`)
      .join('\n'),
  );
  const [activityDrafts, setActivityDrafts] = useState(
    (lesson.activitySteps ?? lesson.activities ?? []).map((step, index) => ({
      id: step.id || `activity-${index + 1}`,
      title: step.title ?? step.prompt ?? `Activity ${index + 1}`,
      prompt: step.prompt ?? step.title ?? `Activity ${index + 1}`,
      type: step.type ?? 'speak_answer',
      durationMinutes: String(step.durationMinutes ?? 2),
      detail: step.detail ?? '',
      evidence: step.evidence ?? '',
      expectedAnswers: (step.expectedAnswers ?? []).join(', '),
      tags: (step.tags ?? []).join(', '),
      facilitatorNotes: (step.facilitatorNotes ?? []).join('\n'),
    })),
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
        .map((line, index) => line.trim())
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
    })),
    [activityDrafts],
  );

  return (
    <form action={action} style={cardStyle}>
      <input type="hidden" name="lessonId" value={lesson.id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="learningObjectives" value={safeStringify(learningObjectives)} />
      <input type="hidden" name="localization" value={safeStringify(localization)} />
      <input type="hidden" name="lessonAssessment" value={safeStringify(lessonAssessment)} />
      <input type="hidden" name="activitySteps" value={safeStringify(activitySteps)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0 }}>Edit lesson authoring pack</h2>
          <div style={{ color: '#64748b', lineHeight: 1.6, marginTop: 8 }}>
            This edits the real payload: objectives, localization, assessment items, and activity steps. Finally, an authoring surface that does more than polish a status pill.
          </div>
        </div>
        <div style={{ minWidth: 180, padding: 16, borderRadius: 18, background: readinessCount >= 5 ? '#DCFCE7' : readinessCount >= 3 ? '#FEF3C7' : '#FEE2E2', color: readinessCount >= 5 ? '#166534' : readinessCount >= 3 ? '#92400E' : '#991B1B', fontWeight: 800 }}>
          {readinessCount}/5 release checks
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Module: {activeModule?.status ?? 'unknown'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 140px', gap: 12 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr 0.8fr', gap: 12 }}>
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

      <FieldLabel>
        Learning objectives (one per line)
        <textarea value={learningObjectivesText} onChange={(event) => setLearningObjectivesText(event.target.value)} rows={4} style={inputStyle} />
      </FieldLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 18, borderRadius: 18, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#1D4ED8', marginBottom: 10 }}>Localization</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12, marginBottom: 12 }}>
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

        <div style={{ padding: 18, borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748B', marginBottom: 10 }}>Activity spine</div>
          <div style={{ display: 'grid', gap: 12 }}>
            {activityDrafts.map((activity, index) => (
              <div key={activity.id} style={{ padding: 14, borderRadius: 16, border: '1px solid #E5E7EB', background: 'white', display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px', gap: 10 }}>
                  <FieldLabel>
                    Step title
                    <input value={activity.title} onChange={(event) => setActivityDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value, prompt: event.target.value } : item))} style={inputStyle} />
                  </FieldLabel>
                  <FieldLabel>
                    Type
                    <select value={activity.type} onChange={(event) => setActivityDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value } : item))} style={inputStyle}>
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
                    <input value={activity.durationMinutes} onChange={(event) => setActivityDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, durationMinutes: event.target.value } : item))} style={inputStyle} />
                  </FieldLabel>
                </div>
                <FieldLabel>
                  Detail
                  <textarea value={activity.detail} onChange={(event) => setActivityDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, detail: event.target.value } : item))} rows={3} style={inputStyle} />
                </FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FieldLabel>
                    Evidence
                    <input value={activity.evidence} onChange={(event) => setActivityDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, evidence: event.target.value } : item))} style={inputStyle} />
                  </FieldLabel>
                  <FieldLabel>
                    Expected answers (comma separated)
                    <input value={activity.expectedAnswers} onChange={(event) => setActivityDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, expectedAnswers: event.target.value } : item))} style={inputStyle} />
                  </FieldLabel>
                </div>
                <FieldLabel>
                  Facilitator notes (one per line)
                  <textarea value={activity.facilitatorNotes} onChange={(event) => setActivityDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, facilitatorNotes: event.target.value } : item))} rows={2} style={inputStyle} />
                </FieldLabel>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ActionButton label="Save full lesson pack" pendingLabel="Saving lesson pack…" style={buttonStyle} />
    </form>
  );
}
