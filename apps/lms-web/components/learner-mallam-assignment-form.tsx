import type { Mallam, Student } from '../lib/types';
import { assignLearnerMallamAction } from '../app/actions';
import { ActionButton } from './action-button';

export function LearnerMallamAssignmentForm({ student, mallams, returnPath }: { student: Student; mallams: Mallam[]; returnPath: string }) {
  return (
    <form action={assignLearnerMallamAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 14, border: '1px solid #eef2f7' }}>
      <div>
        <h2 style={{ margin: 0 }}>Mallam assignment</h2>
        <p style={{ color: '#64748b', margin: '8px 0 0' }}>Assign, change, or clear this learner’s mallam from the same ownership model used by roster views.</p>
      </div>
      <input type="hidden" name="studentId" value={student.id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <select name="mallamId" defaultValue={student.mallamId ?? 'unassigned'} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14 }}>
        <option value="unassigned">No mallam assigned</option>
        {mallams.map((mallam) => (
          <option key={mallam.id} value={mallam.id}>{mallam.displayName} · {mallam.podLabels.join(', ') || 'No pods'}</option>
        ))}
      </select>
      <ActionButton label="Save mallam assignment" pendingLabel="Saving assignment…" style={{ background: '#6C63FF', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }} />
    </form>
  );
}
