import {
  approveRewardRequestAction,
  expireRewardRequestAction,
  expireStaleRewardRequestsAction,
  fulfillRewardRequestAction,
  requeueRewardRequestAction,
} from '../app/actions';
import type { RewardRequestQueue } from '../lib/types';
import { Card, Pill, responsiveGrid } from '../lib/ui';

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 14,
  width: '100%',
  background: 'white',
} as const;

const buttonStyle = {
  border: 0,
  borderRadius: 12,
  padding: '10px 12px',
  fontWeight: 700,
  cursor: 'pointer',
} as const;

function statusTone(status: string) {
  if (status === 'fulfilled') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'approved') return { tone: '#DBEAFE', text: '#1D4ED8' };
  if (status === 'expired' || status === 'rejected' || status === 'cancelled') return { tone: '#FEE2E2', text: '#991B1B' };
  return { tone: '#FEF3C7', text: '#92400E' };
}

function ageTone(ageDays: number | null | undefined) {
  if ((ageDays ?? 0) >= 3) return { tone: '#FEE2E2', text: '#991B1B', label: 'Urgent' };
  if ((ageDays ?? 0) >= 1) return { tone: '#FEF3C7', text: '#92400E', label: 'Attention' };
  return { tone: '#ECFDF5', text: '#166534', label: 'Fresh' };
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function RewardRequestQueuePanel({ queue }: { queue: RewardRequestQueue }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Reward queue health" eyebrow="Expiry + fulfillment control">
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ ...responsiveGrid(180), gap: 12 }}>
            {[
              ['Pending', String(queue.summary.pending)],
              ['Approved', String(queue.summary.approved)],
              ['Urgent backlog', String(queue.summary.urgentCount)],
              ['Avg age', `${queue.summary.averageAgeDays.toFixed(1)} days`],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>{label}</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{value}</div>
              </div>
            ))}
          </div>

          <form action={expireStaleRewardRequestsAction} style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 18, background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Bulk expire stale requests</div>
              <div style={{ color: '#9a3412', lineHeight: 1.6 }}>Use this to clean old reward debt out of the queue instead of letting stale requests rot forever.</div>
            </div>
            <div style={{ ...responsiveGrid(180), gap: 12 }}>
              <label style={{ display: 'grid', gap: 6, color: '#7c2d12' }}>
                Older than days
                <input name="olderThanDays" type="number" min="1" defaultValue="14" style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 6, color: '#7c2d12' }}>
                Request limit
                <input name="limit" type="number" min="1" max="500" defaultValue="100" style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 6, color: '#7c2d12' }}>
                Include approved
                <select name="includeApproved" defaultValue="yes" style={inputStyle}>
                  <option value="yes">Yes — clear approved stragglers too</option>
                  <option value="no">No — pending only</option>
                </select>
              </label>
            </div>
            <label style={{ display: 'grid', gap: 6, color: '#7c2d12' }}>
              Admin note
              <input name="adminNote" defaultValue="Bulk expired from rewards queue board" style={inputStyle} />
            </label>
            <button type="submit" style={{ ...buttonStyle, background: '#c2410c', color: 'white' }}>Expire stale requests</button>
          </form>
        </div>
      </Card>

      <Card title="Reward request queue" eyebrow="Dedicated operator lane">
        <div style={{ display: 'grid', gap: 14 }}>
          {queue.items.length ? queue.items.map((item) => {
            const tone = statusTone(item.status);
            const freshness = ageTone(item.ageDays);
            return (
              <div key={item.id} style={{ padding: 18, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>{item.rewardTitle}</div>
                    <div style={{ color: '#64748b', lineHeight: 1.6 }}>{item.learnerName ?? item.studentId} • {item.xpCost} XP • requested {formatDate(item.createdAt)} via {item.requestedVia ?? 'unknown route'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Pill label={item.status} tone={tone.tone} text={tone.text} />
                    <Pill label={`${freshness.label}${item.ageDays != null ? ` · ${item.ageDays.toFixed(1)}d` : ''}`} tone={freshness.tone} text={freshness.text} />
                  </div>
                </div>

                {item.learnerNote ? (
                  <div style={{ padding: 14, borderRadius: 14, background: 'white', border: '1px solid #e2e8f0', color: '#475569', lineHeight: 1.6 }}>
                    <strong style={{ color: '#0f172a' }}>Learner note:</strong> {item.learnerNote}
                  </div>
                ) : null}

                <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                  {item.fulfilledAt
                    ? `Fulfilled ${formatDate(item.fulfilledAt)}${item.lifecycle?.createdToFulfilledHours != null ? ` • ${item.lifecycle.createdToFulfilledHours.toFixed(1)}h turnaround` : ''}`
                    : item.approvedAt
                      ? `Approved ${formatDate(item.approvedAt)}${item.lifecycle?.createdToApprovedHours != null ? ` • ${item.lifecycle.createdToApprovedHours.toFixed(1)}h to approval` : ''}`
                      : 'Not actioned yet.'}
                </div>

                <div style={{ ...responsiveGrid(260), gap: 12 }}>
                  <form action={approveRewardRequestAction} style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 16, background: 'white', border: '1px solid #dbeafe' }}>
                    <input type="hidden" name="requestId" value={item.id} />
                    <div style={{ fontWeight: 700 }}>Approve for fulfillment</div>
                    <input name="adminNote" defaultValue={`Approved ${item.rewardTitle} for ${item.learnerName ?? item.studentId}`} style={inputStyle} />
                    <button type="submit" style={{ ...buttonStyle, background: '#2563eb', color: 'white' }}>Approve</button>
                  </form>

                  <form action={fulfillRewardRequestAction} style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 16, background: 'white', border: '1px solid #bbf7d0' }}>
                    <input type="hidden" name="requestId" value={item.id} />
                    <div style={{ fontWeight: 700 }}>Mark fulfilled</div>
                    <input name="adminNote" defaultValue={`Fulfilled ${item.rewardTitle} for ${item.learnerName ?? item.studentId}`} style={inputStyle} />
                    <button type="submit" style={{ ...buttonStyle, background: '#16a34a', color: 'white' }}>Fulfill</button>
                  </form>

                  <form action={requeueRewardRequestAction} style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 16, background: 'white', border: '1px solid #e9d5ff' }}>
                    <input type="hidden" name="requestId" value={item.id} />
                    <input type="hidden" name="reason" value="needs_follow_up" />
                    <div style={{ fontWeight: 700 }}>Requeue approved item</div>
                    <input name="adminNote" defaultValue={`Requeue ${item.rewardTitle} for follow-up`} style={inputStyle} />
                    <button type="submit" style={{ ...buttonStyle, background: '#7c3aed', color: 'white' }}>Requeue</button>
                  </form>

                  <form action={expireRewardRequestAction} style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 16, background: 'white', border: '1px solid #fecaca' }}>
                    <input type="hidden" name="requestId" value={item.id} />
                    <input type="hidden" name="reason" value="stale_request" />
                    <div style={{ fontWeight: 700 }}>Expire request</div>
                    <input name="adminNote" defaultValue={`Expire stale ${item.rewardTitle} request`} style={inputStyle} />
                    <button type="submit" style={{ ...buttonStyle, background: '#dc2626', color: 'white' }}>Expire</button>
                  </form>
                </div>
              </div>
            );
          }) : (
            <div style={{ padding: 16, borderRadius: 18, background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534', lineHeight: 1.6 }}>
              No reward requests are visible in the current scope. Either the queue is genuinely clear, or the learner app has not started sending redemption traffic yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
