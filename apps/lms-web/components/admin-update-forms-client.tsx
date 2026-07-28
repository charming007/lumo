'use client';

import { useMemo, useState } from 'react';
import { updateAssessmentAction, updateLessonAction, updateModuleAction } from '../app/actions';
import type { Assessment, CurriculumModule, Lesson } from '../lib/types';
import { ActionButton } from './action-button';
import { LifecycleStatusField } from './lifecycle-status-field';
import { normalizeModuleLifecycleStatus } from '../lib/module-status';

const cardStyle = {
  background: 'linear-gradient(180deg, #ffffff 0%, #fbfcff 100%)',
  borderRadius: 24,
  padding: 'clamp(22px, 3vw, 30px)',
  display: 'grid',
  gap: 20,
  border: '1px solid #e6ebf3',
  boxShadow: '0 18px 48px rgba(76, 83, 112, 0.08)',
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
} as const;

const inputStyle = {
  border: '1px solid #d8deea',
  borderRadius: 14,
  padding: '13px 42px 13px 15px',
  fontSize: 15,
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  background: '#ffffff',
  color: '#111827',
  boxShadow: '0 1px 0 rgba(15, 23, 42, 0.02), inset 0 0 0 1px rgba(255,255,255,0.7)',
  outlineColor: '#6D5DF7',
} as const;

const buttonStyle = {
  background: '#6C63FF',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer',
} as const;

const twoColumnGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
  gap: '18px 20px',
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
} as const;

const threeColumnGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
  gap: '18px 20px',
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
} as const;

const MODULE_LIFECYCLE_OPTIONS = [
  { value: 'draft', label: 'Draft', hint: 'Work-in-progress only. Safe for internal editing, not for learner-facing release.', tone: '#F8FAFC', text: '#334155', border: '#CBD5E1' },
  { value: 'review', label: 'In review', hint: 'Structured enough for QA or editorial checks, but still blocked from release.', tone: '#FFFBEB', text: '#92400E', border: '#FCD34D' },
  { value: 'published', label: 'Published', hint: 'Live release state. This is the learner-ready lane.', tone: '#ECFDF5', text: '#166534', border: '#86EFAC' },
] as const;

const LESSON_LIFECYCLE_OPTIONS = [
  ...MODULE_LIFECYCLE_OPTIONS,
  { value: 'approved', label: 'Approved', hint: 'Content quality is accepted, but it is not live until you explicitly publish it.', tone: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD' },
] as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 10, color: '#334155', fontSize: 14, fontWeight: 750, lineHeight: 1.25, minWidth: 0, maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>{children}</label>;
}

function SectionHint({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#64748b', lineHeight: 1.6, fontSize: 14 }}>{children}</div>;
}

export function UpdateModuleFormClient({ modules, returnPath }: { modules: CurriculumModule[]; returnPath?: string }) {
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? '');
  const selectedModule = useMemo(
    () => modules.find((item) => item.id === moduleId) ?? modules[0],
    [moduleId, modules],
  );

  return (
    <form action={updateModuleAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Update module</h2>
      <SectionHint>Pick the exact module to edit. No more “first row wins” nonsense.</SectionHint>
      <FieldLabel>Module<select name="moduleId" value={moduleId} onChange={(event) => setModuleId(event.target.value)} style={inputStyle}>{modules.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.strandName} • {item.title}</option>)}</select></FieldLabel>
      <FieldLabel>Title<input key={selectedModule?.id ?? 'no-module'} name="title" defaultValue={selectedModule?.title ?? ''} style={inputStyle} /></FieldLabel>
      <LifecycleStatusField key={`module-status-${selectedModule?.id ?? 'no-module'}`} name="status" value={normalizeModuleLifecycleStatus(selectedModule?.status)} options={[...MODULE_LIFECYCLE_OPTIONS]} entityLabel="module" />
      <div style={twoColumnGrid}>
        <FieldLabel>Lesson count<input key={`module-lessons-${selectedModule?.id ?? 'no-module'}`} name="lessonCount" type="number" min="1" defaultValue={String(selectedModule?.lessonCount ?? 1)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Level<select key={`module-level-${selectedModule?.id ?? 'no-module'}`} name="level" defaultValue={selectedModule?.level ?? 'beginner'} style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
      </div>
      <ActionButton label="Save module changes" pendingLabel="Saving module…" style={buttonStyle} />
    </form>
  );
}

export function UpdateLessonFormClient({ lessons, returnPath }: { lessons: Lesson[]; returnPath?: string }) {
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '');
  const selectedLesson = useMemo(
    () => lessons.find((item) => item.id === lessonId) ?? lessons[0],
    [lessonId, lessons],
  );

  return (
    <form action={updateLessonAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Update lesson</h2>
      <SectionHint>Pick the exact lesson to move through draft, review, approved, or published states.</SectionHint>
      <FieldLabel>Lesson<select name="lessonId" value={lessonId} onChange={(event) => setLessonId(event.target.value)} style={inputStyle}>{lessons.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      <LifecycleStatusField key={`lesson-status-${selectedLesson?.id ?? 'no-lesson'}`} name="status" value={selectedLesson?.status ?? 'draft'} options={LESSON_LIFECYCLE_OPTIONS} entityLabel="lesson" />
      <div style={twoColumnGrid}>
        <FieldLabel>Mode<select key={`lesson-mode-${selectedLesson?.id ?? 'no-lesson'}`} name="mode" defaultValue={selectedLesson?.mode ?? 'guided'} style={inputStyle}><option value="guided">Guided</option><option value="group">Group</option><option value="independent">Independent</option><option value="practice">Practice</option></select></FieldLabel>
        <FieldLabel>Duration (min)<input key={`lesson-duration-${selectedLesson?.id ?? 'no-lesson'}`} name="durationMinutes" type="number" min="1" defaultValue={String(selectedLesson?.durationMinutes ?? 8)} style={inputStyle} /></FieldLabel>
      </div>
      <ActionButton label="Save lesson changes" pendingLabel="Saving lesson…" style={buttonStyle} />
    </form>
  );
}

export function UpdateAssessmentFormClient({ assessments, returnPath }: { assessments: Assessment[]; returnPath?: string }) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id ?? '');
  const selectedAssessment = useMemo(
    () => assessments.find((item) => item.id === assessmentId) ?? assessments[0],
    [assessmentId, assessments],
  );

  return (
    <form action={updateAssessmentAction} style={cardStyle}>
      <input type="hidden" name="returnPath" value={returnPath ?? '/content'} />
      <h2 style={{ margin: 0 }}>Update assessment gate</h2>
      <SectionHint>Target the exact assessment gate instead of silently editing the first one in the list.</SectionHint>
      <FieldLabel>Assessment<select name="assessmentId" value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)} style={inputStyle}>{assessments.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      <FieldLabel>Assessment title<input key={`assessment-title-${selectedAssessment?.id ?? 'no-assessment'}`} name="title" defaultValue={selectedAssessment?.title ?? ''} style={inputStyle} /></FieldLabel>
      <div style={twoColumnGrid}>
        <FieldLabel>Kind<select key={`assessment-kind-${selectedAssessment?.id ?? 'no-assessment'}`} name="kind" defaultValue={selectedAssessment?.kind ?? 'automatic'} style={inputStyle}><option value="automatic">Automatic</option><option value="manual">Manual</option></select></FieldLabel>
        <FieldLabel>Trigger<select key={`assessment-trigger-${selectedAssessment?.id ?? 'no-assessment'}`} name="trigger" defaultValue={selectedAssessment?.trigger ?? 'module-complete'} style={inputStyle}><option value="module-complete">After module complete</option><option value="lesson-cluster">After lesson cluster</option><option value="mallam-review">Mallam review</option></select></FieldLabel>
      </div>
      <FieldLabel>Trigger label<input key={`assessment-trigger-label-${selectedAssessment?.id ?? 'no-assessment'}`} name="triggerLabel" defaultValue={selectedAssessment?.triggerLabel ?? ''} style={inputStyle} /></FieldLabel>
      <div style={threeColumnGrid}>
        <FieldLabel>Progression gate<input key={`assessment-gate-${selectedAssessment?.id ?? 'no-assessment'}`} name="progressionGate" defaultValue={selectedAssessment?.progressionGate ?? ''} style={inputStyle} /></FieldLabel>
        <FieldLabel>Passing score<input key={`assessment-score-${selectedAssessment?.id ?? 'no-assessment'}`} name="passingScore" type="number" min="0" max="1" step="0.01" defaultValue={String(selectedAssessment?.passingScore ?? 0.7)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Status<select key={`assessment-status-${selectedAssessment?.id ?? 'no-assessment'}`} name="status" defaultValue={selectedAssessment?.status ?? 'draft'} style={inputStyle}><option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option></select></FieldLabel>
      </div>
      <ActionButton label="Save assessment changes" pendingLabel="Saving assessment…" style={buttonStyle} />
    </form>
  );
}
