'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  deleteAssessmentAction,
  deleteLessonAction,
  deleteModuleAction,
  updateAssessmentAction,
  updateLessonAction,
  updateModuleAction,
} from '../app/actions';
import type { Assessment, CurriculumModule, Lesson } from '../lib/types';
import { ActionButton } from './action-button';
import { DeleteConfirmSubmit } from './delete-confirm-submit';

const cardStyle = {
  background: 'white',
  borderRadius: 20,
  padding: 24,
  display: 'grid',
  gap: 12,
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
  background: '#6C63FF',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
  cursor: 'pointer',
} as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{children}</label>;
}

function SectionHint({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#64748b', lineHeight: 1.6, fontSize: 14 }}>{children}</div>;
}

function SelectionSummary({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 4 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#8a94a6' }}>Selected record</div>
      <div style={{ fontWeight: 800, color: '#0f172a' }}>{title}</div>
      <div style={{ color: '#64748b', lineHeight: 1.6 }}>{lines.filter(Boolean).join(' • ')}</div>
    </div>
  );
}

export function UpdateModuleFormClient({ modules }: { modules: CurriculumModule[] }) {
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? '');
  const selectedModule = useMemo(() => modules.find((item) => item.id === moduleId) ?? modules[0], [modules, moduleId]);
  const [title, setTitle] = useState(selectedModule?.title ?? '');
  const [status, setStatus] = useState(selectedModule?.status ?? 'draft');
  const [lessonCount, setLessonCount] = useState(String(selectedModule?.lessonCount ?? 1));
  const [level, setLevel] = useState(selectedModule?.level ?? 'beginner');

  useEffect(() => {
    setTitle(selectedModule?.title ?? '');
    setStatus(selectedModule?.status ?? 'draft');
    setLessonCount(String(selectedModule?.lessonCount ?? 1));
    setLevel(selectedModule?.level ?? 'beginner');
  }, [selectedModule]);

  return (
    <form action={updateModuleAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Update module</h2>
      <SectionHint>Pick the exact module to edit. The form now follows your selection instead of silently clinging to the first row.</SectionHint>
      <FieldLabel>Module<select name="moduleId" value={selectedModule?.id ?? ''} onChange={(event) => setModuleId(event.target.value)} style={inputStyle}>{modules.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.strandName} • {item.title}</option>)}</select></FieldLabel>
      {selectedModule ? <SelectionSummary title={selectedModule.title} lines={[selectedModule.subjectName, selectedModule.strandName, `${selectedModule.lessonCount} planned lessons`, selectedModule.level]} /> : null}
      <FieldLabel>Title<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} /></FieldLabel>
      <FieldLabel>Status<select name="status" value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}><option value="draft">Draft</option><option value="review">In review</option><option value="published">Published</option></select></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Lesson count<input name="lessonCount" type="number" min="1" value={lessonCount} onChange={(event) => setLessonCount(event.target.value)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Level<select name="level" value={level} onChange={(event) => setLevel(event.target.value)} style={inputStyle}><option value="beginner">Beginner</option><option value="emerging">Emerging</option><option value="confident">Confident</option></select></FieldLabel>
      </div>
      <ActionButton label="Save module changes" pendingLabel="Saving module…" style={buttonStyle} />
    </form>
  );
}

export function DeleteModuleFormClient({ modules }: { modules: CurriculumModule[] }) {
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? '');
  const selectedModule = useMemo(() => modules.find((item) => item.id === moduleId) ?? modules[0], [modules, moduleId]);

  return (
    <form action={deleteModuleAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Delete module</h2>
      <SectionHint>This removes the module and its linked lessons, assessments, assignments, and progress references from the current curriculum dataset.</SectionHint>
      <FieldLabel>Module<select name="moduleId" value={selectedModule?.id ?? ''} onChange={(event) => setModuleId(event.target.value)} style={inputStyle}>{modules.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.strandName} • {item.title}</option>)}</select></FieldLabel>
      {selectedModule ? <SelectionSummary title={selectedModule.title} lines={[selectedModule.subjectName, selectedModule.strandName, `${selectedModule.lessonCount} planned lessons`, selectedModule.status]} /> : null}
      {selectedModule ? <DeleteConfirmSubmit expectedText={selectedModule.title} entityLabel="module" actionLabel="Delete module" pendingLabel="Deleting module…" impactNote="Linked lessons and release wiring go with it. No sneaky recycle bin." /> : null}
    </form>
  );
}

export function UpdateLessonFormClient({ lessons }: { lessons: Lesson[] }) {
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '');
  const selectedLesson = useMemo(() => lessons.find((item) => item.id === lessonId) ?? lessons[0], [lessons, lessonId]);
  const [status, setStatus] = useState(selectedLesson?.status ?? 'draft');
  const [mode, setMode] = useState(selectedLesson?.mode ?? 'guided');
  const [durationMinutes, setDurationMinutes] = useState(String(selectedLesson?.durationMinutes ?? 8));

  useEffect(() => {
    setStatus(selectedLesson?.status ?? 'draft');
    setMode(selectedLesson?.mode ?? 'guided');
    setDurationMinutes(String(selectedLesson?.durationMinutes ?? 8));
  }, [selectedLesson]);

  return (
    <form action={updateLessonAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Update lesson</h2>
      <SectionHint>Pick the exact lesson to move through draft, review, approved, or published states.</SectionHint>
      <FieldLabel>Lesson<select name="lessonId" value={selectedLesson?.id ?? ''} onChange={(event) => setLessonId(event.target.value)} style={inputStyle}>{lessons.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      {selectedLesson ? <SelectionSummary title={selectedLesson.title} lines={[selectedLesson.subjectName ?? '—', selectedLesson.moduleTitle ?? '—', `${selectedLesson.durationMinutes} min`, selectedLesson.mode]} /> : null}
      <FieldLabel>Status<select name="status" value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}><option value="draft">Draft</option><option value="review">In review</option><option value="approved">Approved</option><option value="published">Published</option></select></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Mode<select name="mode" value={mode} onChange={(event) => setMode(event.target.value)} style={inputStyle}><option value="guided">Guided</option><option value="group">Group</option><option value="independent">Independent</option><option value="practice">Practice</option></select></FieldLabel>
        <FieldLabel>Duration (min)<input name="durationMinutes" type="number" min="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} style={inputStyle} /></FieldLabel>
      </div>
      <ActionButton label="Save lesson changes" pendingLabel="Saving lesson…" style={buttonStyle} />
    </form>
  );
}

export function DeleteLessonFormClient({ lessons }: { lessons: Lesson[] }) {
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '');
  const selectedLesson = useMemo(() => lessons.find((item) => item.id === lessonId) ?? lessons[0], [lessons, lessonId]);

  return (
    <form action={deleteLessonAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Delete lesson</h2>
      <SectionHint>This removes the lesson and clears linked assignments so the content board stays honest.</SectionHint>
      <FieldLabel>Lesson<select name="lessonId" value={selectedLesson?.id ?? ''} onChange={(event) => setLessonId(event.target.value)} style={inputStyle}>{lessons.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      {selectedLesson ? <SelectionSummary title={selectedLesson.title} lines={[selectedLesson.subjectName ?? '—', selectedLesson.moduleTitle ?? '—', `${selectedLesson.durationMinutes} min`, selectedLesson.status]} /> : null}
      {selectedLesson ? <DeleteConfirmSubmit expectedText={selectedLesson.title} entityLabel="lesson" actionLabel="Delete lesson" pendingLabel="Deleting lesson…" impactNote="Assignments pointing at this lesson get detached too, which is exactly why this needs friction." /> : null}
    </form>
  );
}

export function UpdateAssessmentFormClient({ assessments }: { assessments: Assessment[] }) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id ?? '');
  const selectedAssessment = useMemo(() => assessments.find((item) => item.id === assessmentId) ?? assessments[0], [assessments, assessmentId]);
  const [title, setTitle] = useState(selectedAssessment?.title ?? '');
  const [kind, setKind] = useState(selectedAssessment?.kind ?? 'automatic');
  const [trigger, setTrigger] = useState(selectedAssessment?.trigger ?? 'module-complete');
  const [triggerLabel, setTriggerLabel] = useState(selectedAssessment?.triggerLabel ?? '');
  const [progressionGate, setProgressionGate] = useState(selectedAssessment?.progressionGate ?? '');
  const [passingScore, setPassingScore] = useState(String(selectedAssessment?.passingScore ?? 0.7));
  const [status, setStatus] = useState(selectedAssessment?.status ?? 'draft');

  useEffect(() => {
    setTitle(selectedAssessment?.title ?? '');
    setKind(selectedAssessment?.kind ?? 'automatic');
    setTrigger(selectedAssessment?.trigger ?? 'module-complete');
    setTriggerLabel(selectedAssessment?.triggerLabel ?? '');
    setProgressionGate(selectedAssessment?.progressionGate ?? '');
    setPassingScore(String(selectedAssessment?.passingScore ?? 0.7));
    setStatus(selectedAssessment?.status ?? 'draft');
  }, [selectedAssessment]);

  return (
    <form action={updateAssessmentAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Update assessment gate</h2>
      <SectionHint>Target the exact assessment gate instead of silently editing the first one in the list.</SectionHint>
      <FieldLabel>Assessment<select name="assessmentId" value={selectedAssessment?.id ?? ''} onChange={(event) => setAssessmentId(event.target.value)} style={inputStyle}>{assessments.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      {selectedAssessment ? <SelectionSummary title={selectedAssessment.title} lines={[selectedAssessment.subjectName, selectedAssessment.moduleTitle, selectedAssessment.triggerLabel, `${Math.round((selectedAssessment.passingScore ?? 0) * 100)}% pass mark`]} /> : null}
      <FieldLabel>Assessment title<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Kind<select name="kind" value={kind} onChange={(event) => setKind(event.target.value)} style={inputStyle}><option value="automatic">Automatic</option><option value="manual">Manual</option></select></FieldLabel>
        <FieldLabel>Trigger<select name="trigger" value={trigger} onChange={(event) => setTrigger(event.target.value)} style={inputStyle}><option value="module-complete">After module complete</option><option value="lesson-cluster">After lesson cluster</option><option value="mallam-review">Mallam review</option></select></FieldLabel>
      </div>
      <FieldLabel>Trigger label<input name="triggerLabel" value={triggerLabel} onChange={(event) => setTriggerLabel(event.target.value)} style={inputStyle} /></FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <FieldLabel>Progression gate<input name="progressionGate" value={progressionGate} onChange={(event) => setProgressionGate(event.target.value)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Passing score<input name="passingScore" type="number" min="0" max="1" step="0.01" value={passingScore} onChange={(event) => setPassingScore(event.target.value)} style={inputStyle} /></FieldLabel>
        <FieldLabel>Status<select name="status" value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}><option value="draft">Draft</option><option value="active">Active</option><option value="retired">Retired</option></select></FieldLabel>
      </div>
      <ActionButton label="Save assessment changes" pendingLabel="Saving assessment…" style={buttonStyle} />
    </form>
  );
}

export function DeleteAssessmentFormClient({ assessments }: { assessments: Assessment[] }) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id ?? '');
  const selectedAssessment = useMemo(() => assessments.find((item) => item.id === assessmentId) ?? assessments[0], [assessments, assessmentId]);

  return (
    <form action={deleteAssessmentAction} style={cardStyle}>
      <h2 style={{ margin: 0 }}>Delete assessment gate</h2>
      <SectionHint>This removes the assessment gate and detaches it from any scheduled assignments.</SectionHint>
      <FieldLabel>Assessment<select name="assessmentId" value={selectedAssessment?.id ?? ''} onChange={(event) => setAssessmentId(event.target.value)} style={inputStyle}>{assessments.map((item) => <option key={item.id} value={item.id}>{item.subjectName} • {item.moduleTitle} • {item.title}</option>)}</select></FieldLabel>
      {selectedAssessment ? <SelectionSummary title={selectedAssessment.title} lines={[selectedAssessment.subjectName, selectedAssessment.moduleTitle, selectedAssessment.triggerLabel, selectedAssessment.status]} /> : null}
      {selectedAssessment ? <DeleteConfirmSubmit expectedText={selectedAssessment.title} entityLabel="assessment gate" actionLabel="Delete assessment" pendingLabel="Deleting assessment…" impactNote="This also disconnects scheduled progression checks from the module lane." /> : null}
    </form>
  );
}
