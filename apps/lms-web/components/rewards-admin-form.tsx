import { awardStudentRewardAction } from '../app/actions';
import { ActionButton } from './action-button';
import type { RewardCatalog } from '../lib/rewards';
import type { Student } from '../lib/types';
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

export function RewardsAdminForm({ students, catalog }: { students: Student[]; catalog: RewardCatalog }) {
  if (!students.length) return null;

  return (
    <form action={awardStudentRewardAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 12, border: '1px solid #eef2f7' }}>
      <h2 style={{ margin: 0 }}>Award or correct rewards</h2>
      <div style={{ color: '#64748b', lineHeight: 1.5 }}>
        Use this when ops needs to grant recovery XP, fix a missed badge, or document a manual reward without pretending the system will read your mind.
      </div>
      <select name="studentId" defaultValue={students[0]?.id} style={inputStyle}>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name}
          </option>
        ))}
      </select>
      <div style={{ ...responsiveGrid(180), gap: 12 }}>
        <input name="xpDelta" type="number" defaultValue="25" style={inputStyle} placeholder="XP delta" />
        <input name="label" defaultValue="Manual admin reward" style={inputStyle} placeholder="Reason / label" />
      </div>
      <select name="badgeId" defaultValue="" style={inputStyle}>
        <option value="">No badge change</option>
        {catalog.badges.map((badge) => (
          <option key={badge.id} value={badge.id}>
            {badge.title} · {badge.category}
          </option>
        ))}
      </select>
      <ActionButton label="Save reward adjustment" pendingLabel="Saving reward…" style={buttonStyle} />
    </form>
  );
}
