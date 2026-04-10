import { createAttendanceAction } from '../app/actions';
import { ActionButton } from './action-button';
import type { Student } from '../lib/types';

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

export function AttendanceCaptureForm({ students }: { students: Student[] }) {
  return (
    <form action={createAttendanceAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 12, border: '1px solid #eef2f7' }}>
      <h2 style={{ margin: 0 }}>Capture attendance</h2>
      <div style={{ color: '#64748b', lineHeight: 1.5 }}>Quick desk form for morning/afternoon roll call. Records write straight to the API and bounce back into the attendance board.</div>
      <select name="studentId" defaultValue={students[0]?.id} style={inputStyle}>{students.map((student) => <option key={student.id} value={student.id}>{student.name} • {student.cohortName ?? 'No cohort'}</option>)}</select>
      <input name="date" type="date" defaultValue="2026-04-10" style={inputStyle} />
      <select name="status" defaultValue="present" style={inputStyle}><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option></select>
      <ActionButton label="Save attendance" pendingLabel="Saving attendance…" style={buttonStyle} />
    </form>
  );
}
