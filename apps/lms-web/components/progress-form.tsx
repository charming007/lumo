import { createProgressAction, updateProgressAction } from '../app/actions';
import { ActionButton } from './action-button';
import type { CurriculumModule, ProgressRecord, Student, Subject } from '../lib/types';
import { responsiveGrid } from '../lib/ui';

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
      <div style={{ ...responsiveGrid(180), gap: 12 }}>
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
    <div style={{ display: 'grid', gap: 12 }}>
      {progress.map((item) => {
        const recommendedModuleId = item.recommendedNextModuleId ?? modules[0]?.id;

        return (
          <form key={item.id} action={updateProgressAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 12, border: '1px solid #eef2f7' }}>
            <input type="hidden" name="progressId" value={item.id} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
              <div>
                <h2 style={{ margin: 0 }}>Progression override</h2>
                <div style={{ color: '#111827', fontWeight: 700, marginTop: 4 }}>{item.studentName} · {item.subjectName}</div>
                <div style={{ color: '#64748b', marginTop: 4 }}>
                  Current module: {item.moduleTitle ?? '—'}
                  {item.override?.updatedAt ? ` · Last override ${new Date(item.override.updatedAt).toLocaleString()}` : ''}
                </div>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: 999, background: item.progressionStatus === 'ready' ? '#DCFCE7' : item.progressionStatus === 'watch' ? '#FEF3C7' : '#E0E7FF', color: item.progressionStatus === 'ready' ? '#166534' : item.progressionStatus === 'watch' ? '#92400E' : '#3730A3', fontWeight: 700 }}>
                {item.progressionStatus}
              </div>
            </div>
            <div style={{ ...responsiveGrid(180), gap: 12 }}>
              <input name="mastery" type="number" min="0" max="1" step="0.01" defaultValue={String(item.mastery ?? 0)} style={inputStyle} />
              <input name="lessonsCompleted" type="number" min="0" defaultValue={String(item.lessonsCompleted ?? 0)} style={inputStyle} />
              <select name="progressionStatus" defaultValue={item.progressionStatus} style={inputStyle}><option value="on-track">On track</option><option value="watch">Watch</option><option value="ready">Ready</option></select>
            </div>
            <select name="recommendedNextModuleId" defaultValue={recommendedModuleId} style={inputStyle}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select>
            <textarea name="overrideReason" defaultValue={item.override?.reason ?? ''} style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }} placeholder="Explain the override so the next operator is not stuck guessing." />
            {item.override?.actorName || item.override?.reason ? (
              <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
                Last override: {item.override?.status ?? item.progressionStatus}
                {item.override?.actorName ? ` by ${item.override.actorName}` : ''}
                {item.override?.reason ? ` · ${item.override.reason}` : ''}
              </div>
            ) : null}
            <ActionButton label="Save progression override" pendingLabel="Saving override…" style={buttonStyle} />
          </form>
        );
      })}
    </div>
  );
}
