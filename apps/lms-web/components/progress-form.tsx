import { createProgressAction, updateProgressAction } from '../app/actions';
import { ActionButton } from './action-button';
import type { CurriculumModule, ProgressRecord, Student, Subject } from '../lib/types';

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
} as const;

export function ProgressCaptureForm({ students, subjects, modules }: { students: Student[]; subjects: Subject[]; modules: CurriculumModule[] }) {
  return (
    <form action={createProgressAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 12, border: '1px solid #eef2f7' }}>
      <h2 style={{ margin: 0 }}>Record progress</h2>
      <div style={{ color: '#64748b', lineHeight: 1.5 }}>Create a fresh mastery snapshot after lesson delivery or a checkpoint review.</div>
      <select name="studentId" defaultValue={students[0]?.id} style={inputStyle}>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select>
      <select name="subjectId" defaultValue={subjects[0]?.id} style={inputStyle}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
      <select name="moduleId" defaultValue={modules[0]?.id} style={inputStyle}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <input name="mastery" type="number" min="0" max="1" step="0.01" defaultValue="0.67" style={inputStyle} placeholder="Mastery" />
        <input name="lessonsCompleted" type="number" min="0" defaultValue="5" style={inputStyle} placeholder="Lessons completed" />
        <select name="progressionStatus" defaultValue="on-track" style={inputStyle}><option value="on-track">On track</option><option value="watch">Watch</option><option value="ready">Ready</option></select>
      </div>
      <select name="recommendedNextModuleId" defaultValue={modules[0]?.id} style={inputStyle}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select>
      <ActionButton label="Save progress snapshot" pendingLabel="Saving progress…" style={buttonStyle} />
    </form>
  );
}

export function ProgressUpdateForm({ progress, modules }: { progress: ProgressRecord[]; modules: CurriculumModule[] }) {
  if (!progress.length) return null;

  return (
    <form action={updateProgressAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 12, border: '1px solid #eef2f7' }}>
      <h2 style={{ margin: 0 }}>Update progress</h2>
      <select name="progressId" defaultValue={progress[0]?.id} style={inputStyle}>{progress.map((item) => <option key={item.id} value={item.id}>{item.studentName} • {item.subjectName}</option>)}</select>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <input name="mastery" type="number" min="0" max="1" step="0.01" defaultValue={String(progress[0]?.mastery ?? 0)} style={inputStyle} />
        <input name="lessonsCompleted" type="number" min="0" defaultValue={String(progress[0]?.lessonsCompleted ?? 0)} style={inputStyle} />
        <select name="progressionStatus" defaultValue={progress[0]?.progressionStatus} style={inputStyle}><option value="on-track">On track</option><option value="watch">Watch</option><option value="ready">Ready</option></select>
      </div>
      <select name="recommendedNextModuleId" defaultValue={modules[0]?.id} style={inputStyle}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select>
      <ActionButton label="Update progress" pendingLabel="Updating progress…" style={buttonStyle} />
    </form>
  );
}
