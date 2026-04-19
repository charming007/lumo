import Link from 'next/link';
import { checkpointStorageAction, deleteStorageBackupAction, repairStorageIntegrityAction, restoreStorageBackupAction } from '../actions';
import { ActionButton } from '../../components/action-button';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { ExportShareCard } from '../../components/export-share-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchMeta, fetchOperationsReport, fetchRewardsLeaderboard, fetchRewardsReport, fetchStorageBackups, fetchStorageIntegrity, fetchStorageStatus, fetchWorkboard } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import type { MetaResponse, OperationsReport, RewardSnapshot, RewardsReport, StorageBackupList, StorageIntegrityReport, StorageStatus, WorkboardItem } from '../../lib/types';

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
    studentCount: 0,
    runtimeSessionCount: 0,
    rewardRequestCount: 0,
    rewardTransactionCount: 0,
    issueCount: 0,
  },
  issues: [],
};

const EMPTY_STORAGE_BACKUPS: StorageBackupList = {
  items: [],
  status: null,
};

const EMPTY_OPERATIONS_REPORT: OperationsReport = {
  scope: { limit: 0 },
  summary: {
    learnersInScope: 0,
    runtimeCompletionRate: 0,
    runtimeAbandonedSessions: 0,
    progressionReady: 0,
    progressionWatch: 0,
    rewardPendingRequests: 0,
    rewardFulfillmentRate: 0,
    integrityIssueCount: 0,
  },
  runtime: {},
  progression: {},
  rewards: {},
  integrity: {},
  hotlist: {
    watchLearners: [],
    readyLearners: [],
    runtimeLearners: [],
    rewardQueue: [],
  },
  recent: {
    sessions: [],
    events: [],
    overrides: [],
    rewardAdjustments: [],
    integrityIssues: [],
  },
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

  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Settings"
        subtitle="Operational controls for persistence, rewards, progression, and storage integrity only matter when the production LMS is wired to a real API."
        blockerHeadline="Settings is blocked until NEXT_PUBLIC_API_BASE_URL is configured."
        blockerDetail={(
          <>
            This page currently renders a very convincing ops cockpit even when its storage, rewards, workboard, and integrity feeds are dead. That is worse than a crash: it can imply production trust, backup visibility, and repair readiness when the app is actually disconnected.
          </>
        )}
        whyBlocked={[
          'Without NEXT_PUBLIC_API_BASE_URL in production, settings would silently fall back to empty reports, null storage status, and placeholder trust messaging.',
          'Operators could read a polished “trust center” and assume persistence, backups, or integrity checks are healthy when no live backend was reached.',
          'Blocking here keeps deployment reviewers from mistaking dead feeds for a safe admin posture.',
        ]}
        verificationItems={[
          {
            surface: 'Settings trust center',
            expected: 'Shows real storage mode, persistence, integrity issue counts, and backup visibility from the live API.',
            failure: 'Nice-looking trust summary appears with zeroed metrics or vague degraded copy after env setup is supposedly complete.',
          },
          {
            surface: 'Storage control center',
            expected: 'Updated timestamps, database URL state, and checkpoint inventory resolve from production.',
            failure: 'Unknown storage mode, missing timestamps, or empty backup inventory despite a live environment.',
          },
          {
            surface: 'Rewards + operations panels',
            expected: 'Leaderboard, rewards report, and operations report all show live counts instead of empty fallback tables.',
            failure: 'Page renders cleanly but most panels still say unavailable / no data while other admin surfaces are live.',
          },
        ]}
        docs={[
          { label: 'Verify dashboard', href: '/', background: '#fff7ed', color: '#9a3412' },
          { label: 'Verify reports', href: '/reports', background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' },
          { label: 'Open guide', href: '/guide#guardrails', background: '#0f172a', color: 'white' },
        ]}
      />
    );
  }

  const [metaResult, leaderboardResult, workboardResult, rewardsReportResult, storageStatusResult, integrityResult, backupsResult, operationsResult] = await Promise.allSettled([
    fetchMeta(),
    fetchRewardsLeaderboard(8),
    fetchWorkboard(),
    fetchRewardsReport(8),
    fetchStorageStatus(),
    fetchStorageIntegrity(),
    fetchStorageBackups(8),
    fetchOperationsReport(8),
  ]);

  const meta = metaResult.status === 'fulfilled' ? metaResult.value : EMPTY_META;
  const leaderboard: RewardSnapshot[] = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
  const workboard: WorkboardItem[] = workboardResult.status === 'fulfilled' ? workboardResult.value : [];
  const rewardsReport = rewardsReportResult.status === 'fulfilled' ? rewardsReportResult.value : EMPTY_REWARDS_REPORT;
  const storageStatus: StorageStatus | null = storageStatusResult.status === 'fulfilled' ? storageStatusResult.value : null;
  const integrity = integrityResult.status === 'fulfilled' ? integrityResult.value : EMPTY_STORAGE_INTEGRITY;
  const backups = backupsResult.status === 'fulfilled' ? backupsResult.value : EMPTY_STORAGE_BACKUPS;
  const operationsReport = operationsResult.status === 'fulfilled' ? operationsResult.value : EMPTY_OPERATIONS_REPORT;

  const failedSources = [
    metaResult.status === 'rejected' ? 'platform metadata' : null,
    leaderboardResult.status === 'rejected' ? 'XP leaderboard' : null,
    workboardResult.status === 'rejected' ? 'progression workboard' : null,
    rewardsReportResult.status === 'rejected' ? 'rewards report' : null,
    storageStatusResult.status === 'rejected' ? 'storage status' : null,
    integrityResult.status === 'rejected' ? 'storage integrity' : null,
    backupsResult.status === 'rejected' ? 'storage backups' : null,
    operationsResult.status === 'rejected' ? 'operations report' : null,
  ].filter(Boolean);

  const ready = workboard.filter((item) => item.progressionStatus === 'ready').length;
  const watch = workboard.filter((item) => item.progressionStatus === 'watch').length;
  const averageXp = leaderboard.length ? Math.round(leaderboard.reduce((sum, item) => sum + item.totalXp, 0) / leaderboard.length) : 0;
  const totalBadgesUnlocked = leaderboard.reduce((sum, item) => sum + item.badgesUnlocked, 0);
  const seedEntries = Object.entries(meta.seedSummary ?? {});
  const seedCount = seedEntries.reduce((sum, [, count]) => sum + count, 0);
  const storagePersistent = storageStatus?.db?.persistent ?? storageStatus?.persistent ?? backups.status?.db?.persistent ?? backups.status?.persistent ?? meta.store?.persistent ?? false;
  const storageMode = storageStatus?.db?.mode ?? storageStatus?.mode ?? backups.status?.db?.mode ?? backups.status?.mode ?? meta.store?.mode ?? meta.mode;
  const storageDriver = storageStatus?.db?.driver ?? backups.status?.db?.driver ?? meta.store?.driver ?? 'unknown';
  const integrityStudentCount = integrity.summary.studentCount ?? integrity.summary.students ?? 0;
  const integrityRuntimeSessions = integrity.summary.runtimeSessionCount ?? integrity.summary.sessions ?? 0;
  const integrityRewardRequests = integrity.summary.rewardRequestCount ?? integrity.summary.rewardRequests ?? 0;
  const issuePreview = integrity.issues.slice(0, 6);
  const visibleBackups = backups.items.length ? backups.items : (storageStatus?.backups ?? []);
  const seededCatalogVisible = seedCount > 0;
  const trustState = failedSources.length
    ? 'Operator review required'
    : integrity.summary.issueCount
      ? 'Integrity issues need cleanup'
      : storagePersistent
        ? seededCatalogVisible
          ? 'Live backend + seeded catalog'
          : 'Live backend posture visible'
        : 'Volatile mode — do not fake confidence';
  const trustDetail = failedSources.length
    ? `Settings is missing ${failedSources.join(', ')} data, so treat this surface as advisory until the feeds recover.`
    : integrity.summary.issueCount
      ? `${integrity.summary.issueCount} integrity issue${integrity.summary.issueCount === 1 ? '' : 's'} are visible. Fix those before calling the stack healthy.`
      : storagePersistent
        ? seededCatalogVisible
          ? `Backend storage is live in ${String(storageMode || 'unknown')} mode with persistent backing and ${visibleBackups.length} visible backup${visibleBackups.length === 1 ? '' : 's'}. The curriculum/admin dataset still includes ${seedCount} seeded pack${seedCount === 1 ? '' : 's'}, so do not describe this as fully live content.`
          : `Backend storage is live in ${String(storageMode || 'unknown')} mode with persistent backing and ${visibleBackups.length} visible backup${visibleBackups.length === 1 ? '' : 's'}.`
        : 'This environment is still volatile. Nice-looking controls do not magically make ephemeral storage safe.';
  const settingsDateStamp = new Date().toISOString().slice(0, 10);
  const settingsShareText = [
    `Lumo settings trust snapshot · ${trustState}`,
    trustDetail,
    `Storage mode: ${String(storageMode || 'unknown')} (${storagePersistent ? 'persistent' : 'volatile'}) via ${storageDriver}.`,
    `Progression watch: ${watch} · ready now: ${ready}.`,
    `Reward queue: ${operationsReport.summary.rewardPendingRequests} pending with ${operationsReport.summary.integrityIssueCount} integrity issues reported.`,
  ].join('\n');
  const settingsJson = JSON.stringify({
    generatedAt: new Date().toISOString(),
    trustState,
    trustDetail,
    storage: {
      mode: storageMode,
      persistent: storagePersistent,
      driver: storageDriver,
      backupsVisible: visibleBackups.length,
      updatedAt: storageStatus?.updatedAt ?? null,
    },
    rewards: {
      leaderboardLearners: leaderboard.length,
      averageXp,
      badgesUnlocked: totalBadgesUnlocked,
      pendingRequests: operationsReport.summary.rewardPendingRequests,
    },
    progression: {
      ready,
      watch,
      fulfillmentRate: rewardsReport.summary.fulfillmentRate,
    },
    integrity: integrity,
  }, null, 2);

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

      <section style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16, marginBottom: 20 }}>
        <Card title="Production trust center" eyebrow="Operational truth, not vibes">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ padding: '18px 20px', borderRadius: 18, background: failedSources.length ? '#fff7ed' : integrity.summary.issueCount ? '#FEF2F2' : storagePersistent ? '#ECFDF5' : '#FEF3C7', border: `1px solid ${failedSources.length ? '#fed7aa' : integrity.summary.issueCount ? '#fecaca' : storagePersistent ? '#bbf7d0' : '#FDE68A'}` }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800, marginBottom: 8 }}>Trust status</div>
              <strong style={{ display: 'block', fontSize: 22, color: '#0f172a', marginBottom: 6 }}>{trustState}</strong>
              <div style={{ color: '#475569', lineHeight: 1.7 }}>{trustDetail}</div>
            </div>
            <div style={{ ...responsiveGrid(180), gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>Persistence</div>
                <strong>{storagePersistent ? 'Durable backing live' : 'Volatile only'}</strong>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>Integrity load</div>
                <strong>{integrity.summary.issueCount} issue{integrity.summary.issueCount === 1 ? '' : 's'}</strong>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>Backup visibility</div>
                <strong>{visibleBackups.length} checkpoint{visibleBackups.length === 1 ? '' : 's'} visible</strong>
              </div>
            </div>
          </div>
        </Card>

        <ExportShareCard
          title="Ops handoff pack"
          eyebrow="Share / export"
          summary="This is the clean handoff for product, ops, or deployment review: copy the trust summary, share it from mobile, or download the JSON snapshot before anyone starts making risky changes with selective memory."
          shareTitle="Lumo settings trust snapshot"
          shareText={settingsShareText}
          artifacts={[
            { label: 'Download trust summary (.txt)', filename: `lumo-settings-${settingsDateStamp}.txt`, mimeType: 'text/plain', content: settingsShareText, tone: '#EEF2FF', text: '#3730A3' },
            { label: 'Download settings snapshot (.json)', filename: `lumo-settings-${settingsDateStamp}.json`, mimeType: 'application/json', content: settingsJson, tone: '#ECFDF5', text: '#166534' },
          ]}
        />
      </section>

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

      <section style={{ ...responsiveGrid(280), marginBottom: 20 }}>
        <Card title="Route handoff" eyebrow="Use the right surface next">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Rewards board', href: '/rewards', detail: 'Adjust transactions, queue decisions, and live learner reward state.' },
              { label: 'Reports', href: '/reports', detail: 'Check whether reward, progression, or integrity changes actually improved the operating picture.' },
              { label: 'LMS guide', href: '/guide#guardrails', detail: 'Use the guardrails section when someone wants to “just tweak the UI” into a regression.' },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <strong style={{ color: '#0f172a' }}>{item.label}</strong>
                  <span style={{ color: '#4F46E5', fontWeight: 800 }}>Open →</span>
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.6, marginTop: 6 }}>{item.detail}</div>
              </Link>
            ))}
          </div>
        </Card>

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

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Operations report" eyebrow="Runtime + progression + rewards in one view">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ ...responsiveGrid(160), gap: 12 }}>
              {[
                ['Learners in scope', String(operationsReport.summary.learnersInScope)],
                ['Runtime completion', formatPercent(operationsReport.summary.runtimeCompletionRate)],
                ['Ready to progress', String(operationsReport.summary.progressionReady)],
                ['Pending reward queue', String(operationsReport.summary.rewardPendingRequests)],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 16, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', marginBottom: 6 }}>{label}</div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <SimpleTable
              columns={['Watch learners', 'Mallam', 'Pod', 'Focus', 'XP']}
              rows={operationsReport.hotlist.watchLearners.length ? operationsReport.hotlist.watchLearners.map((entry) => ([
                entry.studentName,
                entry.mallamName ?? '—',
                entry.podLabel ?? '—',
                entry.focus,
                `${entry.totalXp} XP`,
              ])) : [[<span key="watch-none" style={{ color: '#64748b' }}>No watchlist learners in the current operations scope.</span>, '', '', '', '']]}
            />
          </div>
        </Card>

        <Card title="Release-safe operational cues" eyebrow="What to act on next">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              `Runtime abandonment is sitting at ${operationsReport.summary.runtimeAbandonedSessions}. If that climbs, fix delivery friction before writing more shiny content.`,
              `${operationsReport.summary.progressionWatch} learners are flagged watch-side while ${operationsReport.summary.progressionReady} are ready. That balance is the real coaching workload, not the mood in the room.`,
              `Reward fulfillment is ${formatPercent(operationsReport.summary.rewardFulfillmentRate)} with ${operationsReport.summary.integrityIssueCount} integrity issues detected. If either number gets ugly, mallams stop trusting the system fast.`,
            ].map((detail) => (
              <div key={detail} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#475569', lineHeight: 1.7 }}>
                {detail}
              </div>
            ))}
            <SimpleTable
              columns={['Recent runtime session', 'Status', 'At']}
              rows={operationsReport.recent.sessions.length ? operationsReport.recent.sessions.slice(0, 4).map((entry, index) => ([
                asText(entry.lessonTitle ?? entry.lessonId ?? `Session ${index + 1}`),
                asText(entry.status ?? entry.completionState ?? 'unknown'),
                asText(entry.lastActivityAt ?? entry.completedAt ?? entry.createdAt),
              ])) : [[<span key="session-none" style={{ color: '#64748b' }}>No recent runtime sessions reported.</span>, '', '']]}
            />
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
             <div style={{ ...responsiveGrid(140), gap: 10 }}>
              {[
                ['Learner records checked', String(integrityStudentCount)],
                ['Runtime sessions checked', String(integrityRuntimeSessions)],
                ['Reward requests checked', String(integrityRewardRequests)],
                ['Backups visible', String(visibleBackups.length)],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', marginBottom: 6 }}>{label}</div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
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
            {visibleBackups.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {visibleBackups.slice(0, 5).map((backup) => (
                  <div key={backup.path} style={{ padding: 14, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff', display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>{backup.path}</div>
                        <div style={{ color: '#64748b', marginTop: 4 }}>{formatDateTime(backup.updatedAt)} • {backup.sizeBytes ?? 0} bytes</div>
                      </div>
                      <Pill label="Backup" tone="#EEF2FF" text="#3730A3" />
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <form action={restoreStorageBackupAction}>
                        <input type="hidden" name="backupPath" value={backup.path} />
                        <ActionButton label="Restore backup" pendingLabel="Restoring backup…" style={{ background: '#0f172a', color: 'white', border: 0, borderRadius: 12, padding: '10px 12px', fontWeight: 700 }} />
                      </form>
                      <form action={deleteStorageBackupAction}>
                        <input type="hidden" name="backupPath" value={backup.path} />
                        <ActionButton label="Delete backup" pendingLabel="Deleting backup…" style={{ border: '1px solid #fecaca', background: '#FEF2F2', color: '#B91C1C', borderRadius: 12, padding: '10px 12px', fontWeight: 700 }} />
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 14, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', lineHeight: 1.6 }}>
                No restorable backups are visible right now. Create a checkpoint before doing anything spicy to storage, otherwise this page is just giving you false confidence in nice shoes.
              </div>
            )}
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
