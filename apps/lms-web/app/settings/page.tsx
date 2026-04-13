import Link from 'next/link';
import { checkpointStorageAction, repairStorageIntegrityAction } from '../actions';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchMeta, fetchRewardsLeaderboard, fetchRewardsReport, fetchStorageIntegrity, fetchStorageStatus, fetchWorkboard } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import type { MetaResponse, RewardSnapshot, RewardsReport, StorageIntegrityReport, StorageStatus, WorkboardItem } from '../../lib/types';

const EMPTY_META: MetaResponse = {
  actor: {
    role: 'admin',
    name: 'Pilot Admin',
  },
  mode: 'offline',
  seedSummary: {},
};

const EMPTY_REWARDS_REPORT: RewardsReport = {
  scope: { learnerCount: 0 },
  summary: {
    learners: 0,
    transactionCount: 0,
    totalXpAwarded: 0,
    totalXpRedeemed: 0,
    requestCount: 0,
    correctionCount: 0,
    revocationCount: 0,
    fulfillmentRate: 0,
    requestStatusCounts: {},
  },
  dailyXpTrend: [],
  rewardDemand: [],
  recentTransactions: [],
  recentRequests: [],
  recentAdjustments: [],
  learnerBreakdown: [],
  leaderboard: [],
};

const EMPTY_STORAGE_INTEGRITY: StorageIntegrityReport = {
  checkedAt: '',
  summary: {
    students: 0,
    sessions: 0,
    rewardRequests: 0,
    issueCount: 0,
  },
  issues: [],
};

function emptyLeaderboardRow(message: string) {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '', '', '']];
}

function toneForStatus(status: string) {
  if (status === 'ready') return ['#DCFCE7', '#166534'] as const;
  if (status === 'watch') return ['#FEF3C7', '#92400E'] as const;
  return ['#E0E7FF', '#3730A3'] as const;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function asText(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [metaResult, leaderboardResult, workboardResult, rewardsReportResult, storageStatusResult, integrityResult] = await Promise.allSettled([
    fetchMeta(),
    fetchRewardsLeaderboard(8),
    fetchWorkboard(),
    fetchRewardsReport(8),
    fetchStorageStatus(),
    fetchStorageIntegrity(),
  ]);

  const meta = metaResult.status === 'fulfilled' ? metaResult.value : EMPTY_META;
  const leaderboard: RewardSnapshot[] = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
  const workboard: WorkboardItem[] = workboardResult.status === 'fulfilled' ? workboardResult.value : [];
  const rewardsReport = rewardsReportResult.status === 'fulfilled' ? rewardsReportResult.value : EMPTY_REWARDS_REPORT;
  const storageStatus: StorageStatus | null = storageStatusResult.status === 'fulfilled' ? storageStatusResult.value : null;
  const integrity = integrityResult.status === 'fulfilled' ? integrityResult.value : EMPTY_STORAGE_INTEGRITY;

  const failedSources = [
    metaResult.status === 'rejected' ? 'platform metadata' : null,
    leaderboardResult.status === 'rejected' ? 'XP leaderboard' : null,
    workboardResult.status === 'rejected' ? 'progression workboard' : null,
    rewardsReportResult.status === 'rejected' ? 'rewards report' : null,
    storageStatusResult.status === 'rejected' ? 'storage status' : null,
    integrityResult.status === 'rejected' ? 'storage integrity' : null,
  ].filter(Boolean);

  const ready = workboard.filter((item) => item.progressionStatus === 'ready').length;
  const watch = workboard.filter((item) => item.progressionStatus === 'watch').length;
  const averageXp = leaderboard.length ? Math.round(leaderboard.reduce((sum, item) => sum + item.totalXp, 0) / leaderboard.length) : 0;
  const totalBadgesUnlocked = leaderboard.reduce((sum, item) => sum + item.badgesUnlocked, 0);
  const seedEntries = Object.entries(meta.seedSummary ?? {});
  const storagePersistent = storageStatus?.db?.persistent ?? storageStatus?.persistent ?? meta.store?.persistent ?? false;
  const storageMode = storageStatus?.db?.mode ?? storageStatus?.mode ?? meta.store?.mode ?? meta.mode;
  const storageDriver = storageStatus?.db?.driver ?? meta.store?.driver ?? 'unknown';
  const issuePreview = integrity.issues.slice(0, 6);

  return (
    <PageShell
      title="Settings"
      subtitle="Operational controls for reward logic, persistence hygiene, progression policy, voice defaults, and the visual rules that keep the LMS from drifting back into placeholder-land."
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/rewards" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open rewards board
          </Link>
          <Link href="/guide#guardrails" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#0f172a', color: 'white', textDecoration: 'none' }}>
            Open LMS guide
          </Link>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Settings is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Runtime" eyebrow="Environment">
          <MetricList
            items={[
              { label: 'Actor', value: meta.actor.name },
              { label: 'Role', value: meta.actor.role },
              { label: 'Mode', value: meta.mode },
              { label: 'Seed packs', value: String(seedEntries.reduce((sum, [, count]) => sum + count, 0)) },
            ]}
          />
        </Card>

        <Card title="Reward system" eyebrow="XP + badges groundwork">
          <MetricList
            items={[
              { label: 'Learners on leaderboard', value: String(leaderboard.length) },
              { label: 'Average XP', value: String(averageXp) },
              { label: 'Badges unlocked', value: String(totalBadgesUnlocked) },
              { label: 'Highest level seen', value: String(Math.max(0, ...leaderboard.map((item) => item.level))) },
            ]}
          />
        </Card>

        <Card title="Progression policy" eyebrow="Promotion gates">
          <MetricList
            items={[
              { label: 'Ready right now', value: String(ready) },
              { label: 'Watchlist learners', value: String(watch) },
              { label: 'Assessment-gated movement', value: 'Enabled' },
              { label: 'Manual mallam review', value: 'Required on edge cases' },
            ]}
          />
        </Card>

        <Card title="Storage posture" eyebrow="Persistence hygiene">
          <MetricList
            items={[
              { label: 'Storage mode', value: String(storageMode || 'unknown') },
              { label: 'Persistence', value: storagePersistent ? 'Durable' : 'Volatile' },
              { label: 'Driver', value: storageDriver },
              { label: 'Integrity issues', value: String(integrity.summary.issueCount) },
            ]}
          />
        </Card>
      </section>

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Reward configuration playbook" eyebrow="Admin guidance">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['XP earns trust, not chaos', 'Keep XP tied to lesson completion, attendance consistency, and verified mastery moments. Do not spray points for random taps.'],
              ['Badges should mean something', 'Use badges for durable behaviors like streaks, oral confidence, reading milestones, and collaboration — not busywork.'],
              ['Levels must pace the content', 'Learner levels should support module pacing and celebration, but the real promotion gate still comes from mastery + assessment readiness.'],
              ['Mallams need visibility', 'If a reward rule changes, expose the effect in workboards and learner views so facilitators are not guessing why a child jumped levels.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="LMS visual documentation" eyebrow="UI guardrails">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Navigation must stay explicit', 'Every admin surface should show where the operator is, what changed, and what action is next. Hidden state is where demos go to die.'],
              ['Real empty states only', 'When data is missing, say what feed failed and keep the page usable. No fake charts, no lorem ipsum, no “coming soon” wallpaper.'],
              ['Authoring first, toy flows last', 'Compact quick-edit forms are fine for metadata, but lesson creation and English studio work belong in full authoring surfaces.'],
              ['Destructive actions need friction', 'Delete flows should keep typed confirmation and impact notes. If a cascade can wreck a content lane, the UI should say so plainly.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16, marginBottom: 20 }}>
        <Card title="XP and badge leaderboard" eyebrow="Live reward surface">
          <SimpleTable
            columns={['Learner', 'Level', 'XP', 'Next level', 'Badges', 'Recent status']}
            rows={leaderboard.length ? leaderboard.map((item) => {
              const matchingWorkboard = workboard.find((entry) => entry.studentName === item.learnerName);
              const [pillTone, pillText] = toneForStatus(matchingWorkboard?.progressionStatus ?? 'on-track');

              return [
                item.learnerName ?? item.learnerId,
                `${item.level} · ${item.levelLabel}`,
                `${item.totalXp} total (${item.xpIntoLevel}/${item.xpForNextLevel})`,
                item.nextLevelLabel ? `${item.nextLevelLabel} @ ${item.nextLevelXp ?? '—'} XP` : 'Maxed current ladder',
                `${item.badgesUnlocked} unlocked`,
                <Pill key={item.learnerId} label={matchingWorkboard?.progressionStatus ?? 'on-track'} tone={pillTone} text={pillText} />,
              ];
            }) : emptyLeaderboardRow('Reward data is unavailable right now.')}
          />
        </Card>

        <Card title="Seed summary" eyebrow="What the environment loaded">
          <div style={{ display: 'grid', gap: 10 }}>
            {seedEntries.length ? seedEntries.map(([label, count]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <span style={{ color: '#475569', textTransform: 'capitalize' }}>{label.replace(/([A-Z])/g, ' $1').trim()}</span>
                <strong>{count}</strong>
              </div>
            )) : (
              <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7', color: '#64748b' }}>
                Seed summary is unavailable right now.
              </div>
            )}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 16, marginBottom: 20 }}>
        <Card title="Rewards reporting pulse" eyebrow="Now wired to the analytics API">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ ...responsiveGrid(160), gap: 12 }}>
              {[
                ['Learners in scope', String(rewardsReport.summary.learners)],
                ['XP awarded', String(rewardsReport.summary.totalXpAwarded)],
                ['XP redeemed', String(rewardsReport.summary.totalXpRedeemed)],
                ['Fulfillment rate', formatPercent(rewardsReport.summary.fulfillmentRate)],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 16, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', marginBottom: 6 }}>{label}</div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <SimpleTable
              columns={['Learner', 'XP', 'Badges', 'Transactions', 'Requests']}
              rows={rewardsReport.learnerBreakdown.length ? rewardsReport.learnerBreakdown.map((entry) => ([
                entry.learnerName,
                String(entry.totalXp),
                String(entry.badgesUnlocked),
                `${entry.transactions} (${entry.xpAwarded} in / ${entry.xpRedeemed} out)`,
                `${entry.requests} total • ${entry.pendingRequests} pending`,
              ])) : [[<span key="none" style={{ color: '#64748b' }}>No reward analytics available yet.</span>, '', '', '', '']]}
            />
          </div>
        </Card>

        <Card title="Reward demand + requests" eyebrow="What operators are asking for">
          <div style={{ display: 'grid', gap: 12 }}>
            {Object.entries(rewardsReport.summary.requestStatusCounts).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid #eef2f7' }}>
                <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{status}</span>
                <strong>{count}</strong>
              </div>
            ))}
            <div style={{ height: 1, background: '#eef2f7' }} />
            {rewardsReport.rewardDemand.slice(0, 5).map((entry) => (
              <div key={entry.rewardItemId} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <strong>{entry.rewardTitle}</strong>
                  <Pill label={`${entry.requests} requests`} tone="#EEF2FF" text="#3730A3" />
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{entry.fulfilled} fulfilled • {entry.pending} still waiting</div>
              </div>
            ))}
            {!rewardsReport.rewardDemand.length ? <div style={{ color: '#64748b' }}>No reward demand records yet.</div> : null}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Storage control center" eyebrow="Status + checkpoints + repair">
          <div style={{ display: 'grid', gap: 14 }}>
            <MetricList
              items={[
                { label: 'Mode', value: String(storageMode || 'unknown') },
                { label: 'Persistent', value: storagePersistent ? 'Yes' : 'No' },
                { label: 'Database URL configured', value: storageStatus?.db?.hasDatabaseUrl ? 'Yes' : 'No' },
                { label: 'Updated', value: formatDateTime(storageStatus?.updatedAt) },
                { label: 'Backup updated', value: formatDateTime(storageStatus?.backupUpdatedAt) },
              ]}
            />
            <form action={checkpointStorageAction} style={{ display: 'grid', gap: 10 }}>
              <input name="label" defaultValue="settings-checkpoint" placeholder="Checkpoint label" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
              <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}>
                Create storage checkpoint
              </button>
            </form>
            <form action={repairStorageIntegrityAction}>
              <button type="submit" style={{ background: integrity.summary.issueCount ? '#B91C1C' : '#0f172a', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700, width: '100%' }}>
                {integrity.summary.issueCount ? 'Repair integrity issues now' : 'Run safe integrity cleanup'}
              </button>
            </form>
          </div>
        </Card>

        <Card title="Integrity findings" eyebrow="What would break quietly if ignored">
          <div style={{ display: 'grid', gap: 12 }}>
            {issuePreview.length ? issuePreview.map((issue) => (
              <div key={`${issue.type}-${issue.id}`} style={{ padding: 14, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{issue.type}</div>
                <div style={{ color: '#9a3412', lineHeight: 1.6 }}>{issue.entity ?? 'record'} • {issue.id}</div>
              </div>
            )) : (
              <div style={{ padding: 14, borderRadius: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                No integrity issues found in the current report. Good. Keep it that way.
              </div>
            )}
            {storageStatus?.backups?.length ? (
              <SimpleTable
                columns={['Backup path', 'Updated', 'Size']}
                rows={storageStatus.backups.slice(0, 5).map((backup) => ([
                  backup.path,
                  formatDateTime(backup.updatedAt),
                  `${backup.sizeBytes ?? 0} bytes`,
                ]))}
              />
            ) : null}
            {rewardsReport.recentAdjustments.length ? (
              <SimpleTable
                columns={['Recent adjustment', 'Learner', 'At']}
                rows={rewardsReport.recentAdjustments.slice(0, 4).map((entry, index) => ([
                  asText(entry.label ?? entry.action ?? `Adjustment ${index + 1}`),
                  asText(entry.studentName ?? entry.studentId),
                  asText(entry.createdAt),
                ]))}
              />
            ) : null}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
