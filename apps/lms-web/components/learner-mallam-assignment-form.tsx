import type { Pod, Student } from '../lib/types';
import { assignLearnerMallamAction } from '../app/actions';
import { ActionButton } from './action-button';

export function LearnerMallamAssignmentForm({ student, pods, returnPath }: { student: Student; pods: Pod[]; returnPath: string }) {
  return (
    <form action={assignLearnerMallamAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 14, border: '1px solid #eef2f7' }}>
      <div>
        <h2 style={{ margin: 0 }}>Pod routing</h2>
        <p style={{ color: '#64748b', margin: '8px 0 0' }}>Move the learner by pod. Primary mallam ownership follows the selected pod automatically.</p>
      </div>
      <input type="hidden" name="studentId" value={student.id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <select name="podId" defaultValue={student.podId ?? ''} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14 }} required>
        <option value="">Select pod</option>
        {pods.map((pod) => (
          <option key={pod.id} value={pod.id}>{pod.label} · {pod.mallamNames?.[0] || 'No primary mallam yet'}</option>
        ))}
      </select>
      <ActionButton label="Save pod routing" pendingLabel="Saving routing…" style={{ background: '#6C63FF', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }} />
    </form>
  );
}
