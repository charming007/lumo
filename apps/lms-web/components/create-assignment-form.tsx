import { createAssignmentAction } from '../app/actions';
import type { Assessment, Cohort, Lesson, Mallam } from '../lib/types';
import { ActionButton } from './action-button';

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
} as const;

const buttonStyle = {
  background: '#6C63FF',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
} as const;

function nextWeekDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function CreateAssignmentForm({ cohorts, lessons, mallams, assessments }: { cohorts: Cohort[]; lessons: Lesson[]; mallams: Mallam[]; assessments: Assessment[] }) {
  return (
    <form action={createAssignmentAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 12, border: '1px solid #eef2f7' }}>
      <div>
        <h2 style={{ margin: 0 }}>Create assignment</h2>
        <div style={{ color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>
          Publish a clean delivery window: lesson, cohort, mallam owner, assessment gate, and due date in one go.
        </div>
      </div>
      <select name="cohortId" defaultValue={cohorts[0]?.id} style={inputStyle}>
        {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
      </select>
      <select name="lessonId" defaultValue={lessons[0]?.id} style={inputStyle}>
        {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
      </select>
      <select name="assignedBy" defaultValue={mallams[0]?.id} style={inputStyle}>
        {mallams.map((mallam) => <option key={mallam.id} value={mallam.id}>{mallam.displayName}</option>)}
      </select>
      <select name="assessmentId" defaultValue={assessments[0]?.id} style={inputStyle}>
        {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}
      </select>
      <input name="dueDate" defaultValue={nextWeekDate()} placeholder="Due date (YYYY-MM-DD)" style={inputStyle} />
      <select name="status" defaultValue="active" style={inputStyle}><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option></select>
      <ActionButton label="Save assignment" pendingLabel="Saving assignment…" style={buttonStyle} />
      <small style={{ color: '#6b7280', lineHeight: 1.6 }}>Posts to the live API, links the lesson to a real delivery owner, and revalidates assignments, students, mallams, and dashboard views.</small>
    </form>
  );
}
