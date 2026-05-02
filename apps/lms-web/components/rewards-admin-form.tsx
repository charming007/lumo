import { awardStudentRewardAction, correctRewardTransactionAction, revokeRewardTransactionAction } from '../app/actions';
import { ActionButton } from './action-button';
import type { RewardCatalog } from '../lib/rewards';
import type { RewardSnapshot, RewardTransaction, Student } from '../lib/types';
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

const secondaryButtonStyle = {
  background: '#0f172a',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
} as const;

const dangerButtonStyle = {
  background: '#dc2626',
  color: 'white',
  border: 0,
  borderRadius: 12,
  padding: '12px 16px',
  fontWeight: 700,
} as const;

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function collectRecentTransactions(leaderboard: RewardSnapshot[], allowedLearnerIds: Set<string>) {
  return leaderboard
    .filter((snapshot) => allowedLearnerIds.has(snapshot.learnerId))
    .flatMap((snapshot) => snapshot.recentTransactions.map((transaction) => ({
      learnerId: snapshot.learnerId,
      learnerName: snapshot.learnerName ?? snapshot.learnerId,
      transaction,
    })))
    .sort((left, right) => new Date(right.transaction.createdAt ?? 0).getTime() - new Date(left.transaction.createdAt ?? 0).getTime())
    .slice(0, 6);
}

export function RewardsAdminForm({ students, catalog, leaderboard }: { students: Student[]; catalog: RewardCatalog; leaderboard: RewardSnapshot[] }) {
  if (!students.length) return null;

  const allowedLearnerIds = new Set(students.map((student) => student.id));
  const recentTransactions = collectRecentTransactions(leaderboard, allowedLearnerIds);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <form action={awardStudentRewardAction} style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 12, border: '1px solid #eef2f7' }}>
        <h2 style={{ margin: 0 }}>Manual reward adjustment</h2>
        <div style={{ color: '#64748b', lineHeight: 1.5 }}>
          Secondary admin lane: use this when ops needs to grant recovery XP, fix a missed badge, or document a manual reward without pretending the system will read your mind.
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

      <div style={{ background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 16, border: '1px solid #eef2f7' }}>
        <div>
          <h2 style={{ margin: 0 }}>Correct or revoke recent reward transactions</h2>
          <div style={{ color: '#64748b', lineHeight: 1.5, marginTop: 6 }}>
            This is the last-mile admin surface that was missing: adjust the actual transaction, don’t just spray more XP on top and hope nobody notices.
          </div>
        </div>

        {recentTransactions.length ? recentTransactions.map(({ learnerId, learnerName, transaction }) => (
          <div key={transaction.id} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800 }}>{transaction.label || transaction.kind}</div>
                <div style={{ color: '#64748b', marginTop: 4 }}>{learnerName} • {transaction.kind} • {formatDate(transaction.createdAt)}</div>
              </div>
              <div style={{ fontWeight: 800, color: Number(transaction.xpDelta) >= 0 ? '#166534' : '#9a3412' }}>
                {Number(transaction.xpDelta) >= 0 ? '+' : ''}{transaction.xpDelta} XP
              </div>
            </div>

            <div style={{ ...responsiveGrid(260), gap: 12 }}>
              <form action={correctRewardTransactionAction} style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 16, background: 'white', border: '1px solid #e5e7eb' }}>
                <input type="hidden" name="transactionId" value={transaction.id} />
                <input type="hidden" name="reason" value="manual_correction" />
                <div style={{ fontWeight: 700 }}>Correct transaction</div>
                <input name="xpDelta" type="number" defaultValue={String(transaction.xpDelta ?? 0)} style={inputStyle} placeholder="Corrected XP total" />
                <input name="label" defaultValue={String(transaction.label || `Correction for ${transaction.kind}`)} style={inputStyle} placeholder="Correction label" />
                <input name="note" defaultValue={`Correct ${transaction.kind} for ${learnerName}`} style={inputStyle} placeholder="Audit note" />
                <ActionButton label="Save correction" pendingLabel="Saving correction…" style={secondaryButtonStyle} />
              </form>

              <form action={revokeRewardTransactionAction} style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 16, background: 'white', border: '1px solid #fee2e2' }}>
                <input type="hidden" name="transactionId" value={transaction.id} />
                <input type="hidden" name="reason" value="manual_revocation" />
                <div style={{ fontWeight: 700 }}>Revoke transaction</div>
                <input value={learnerId} readOnly style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }} aria-label="Learner id" />
                <input value={`${transaction.label || transaction.kind} • ${transaction.xpDelta} XP`} readOnly style={{ ...inputStyle, background: '#f8fafc', color: '#64748b' }} aria-label="Transaction summary" />
                <input name="note" defaultValue={`Revoke ${transaction.kind} for ${learnerName}`} style={inputStyle} placeholder="Revocation note" />
                <ActionButton label="Revoke transaction" pendingLabel="Revoking…" style={dangerButtonStyle} />
              </form>
            </div>
          </div>
        )) : (
          <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
            No recent reward transactions are visible inside the current filter scope yet.
          </div>
        )}
      </div>
    </div>
  );
}
