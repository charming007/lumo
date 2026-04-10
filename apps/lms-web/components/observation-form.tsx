import { createObservationAction } from '../app/actions';
import { ActionButton } from './action-button';

export function ObservationForm({ studentId }: { studentId: string }) {
  return (
    <form action={createObservationAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 12, border: '1px solid #eef2f7' }}>
      <h2 style={{ margin: 0 }}>Add observation</h2>
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="teacherId" value="teacher-1" />
      <input name="competencyTag" placeholder="Competency tag" defaultValue="listening-speaking" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14 }} />
      <select name="supportLevel" defaultValue="guided" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14 }}>
        <option value="independent">Independent</option>
        <option value="guided">Guided</option>
        <option value="intensive">Intensive</option>
      </select>
      <textarea
        name="note"
        placeholder="Write a teacher observation"
        defaultValue="Learner is responding well to repetition, but needs one more oral practice cycle before progression review."
        rows={5}
        style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14 }}
      />
      <ActionButton label="Save observation" pendingLabel="Saving observation…" style={{ background: '#6C63FF', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }} />
    </form>
  );
}