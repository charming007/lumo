import type { Mallam, Student } from '../lib/types';
import { assignLearnerToMallamAction } from '../app/actions';
import { ActionButton } from './action-button';

export function MallamRosterManager({ mallam, roster, candidateLearners, mallams, returnPath }: { mallam: Mallam; roster: Student[]; candidateLearners: Student[]; mallams: Mallam[]; returnPath: string }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form action={assignLearnerToMallamAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 14, border: '1px solid #eef2f7' }}>
        <div>
          <h2 style={{ margin: 0 }}>Move learner into this pod-first roster</h2>
          <p style={{ color: '#64748b', margin: '8px 0 0' }}>Pick a learner and Lumo will move them onto {(mallam.displayName || mallam.name)}’s primary pod, then derive ownership from that pod. This avoids stale manual mallam-only overrides.</p>
        </div>
        <input type="hidden" name="mallamId" value={mallam.id} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <select name="studentId" defaultValue="" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14 }}>
          <option value="" disabled>Select learner</option>
          {candidateLearners.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name} · {student.cohortName ?? 'No cohort'} · {student.mallamName ? `now with ${student.mallamName}` : 'unassigned'}
            </option>
          ))}
        </select>
        <ActionButton label="Assign learner" pendingLabel="Assigning learner…" style={{ background: '#6C63FF', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }} disabled={!candidateLearners.length} />
      </form>

      <div style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 14, border: '1px solid #eef2f7' }}>
        <div>
          <h2 style={{ margin: 0 }}>Move current learners safely</h2>
          <p style={{ color: '#64748b', margin: '8px 0 0' }}>Move learners to another mallam’s primary pod without leaving the profile. Full detach now belongs in learner pod routing, because pod stays the source of truth.</p>
        </div>
        {roster.length ? roster.map((student) => (
          <div key={student.id} style={{ display: 'grid', gap: 10, padding: 16, borderRadius: 16, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <strong>{student.name}</strong>
                <div style={{ color: '#64748b', marginTop: 4 }}>{student.cohortName ?? 'No cohort'} • {student.podLabel ?? 'No pod'} • {student.level} · {student.stage}</div>
              </div>
              <div style={{ color: '#64748b', fontWeight: 700 }}>{Math.round(student.attendanceRate * 100)}% attendance</div>
            </div>
            <form action={assignLearnerToMallamAction} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="hidden" name="studentId" value={student.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <select name="mallamId" defaultValue={student.mallamId ?? ''} style={{ flex: '1 1 260px', border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14 }}>
                <option value="" disabled>Select destination mallam</option>
                {mallams.filter((option) => option.id !== student.mallamId).map((option) => (
                  <option key={option.id} value={option.id}>{option.displayName || option.name} · {option.podLabels[0] || 'No primary pod'}</option>
                ))}
              </select>
              <ActionButton label="Move learner" pendingLabel="Moving…" style={{ background: '#0f172a', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }} />
            </form>
          </div>
        )) : (
          <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>No learners currently belong to this mallam.</div>
        )}
      </div>
    </div>
  );
}
