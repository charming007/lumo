import Link from 'next/link';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { RewardRequestQueuePanel } from '../../components/reward-request-queue-panel';
import { RewardsAdminForm } from '../../components/rewards-admin-form';
import { fetchRewardRequests, fetchRewardsCatalog, fetchRewardsLeaderboard, fetchStudents } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import type { RewardCatalog, RewardLevel } from '../../lib/rewards';
import type { RewardRequestQueue, RewardSnapshot } from '../../lib/types';

const EMPTY_CATALOG: RewardCatalog = {
  xpRules: {},
  levels: [],
  badges: [],
};

const EMPTY_QUEUE: RewardRequestQueue = {
  items: [],
  summary: {
    total: 0,
    pending: 0,
    approved: 0,
    fulfilled: 0,
    rejected: 0,
    cancelled: 0,
    expired: 0,
    attentionCount: 0,
    urgentCount: 0,
    averageAgeDays: 0,
  },
  meta: {
    cohortId: null,
    podId: null,
    mallamId: null,
    learnerId: null,
    status: null,
    count: 0,
    returned: 0,
  },
};

function levelRange(level: RewardLevel, nextLevel?: RewardLevel) {
  return nextLevel ? `${level.minXp}–${nextLevel.minXp - 1} XP` : `${level.minXp}+ XP`;
}

function emptyRows(message: string) {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '']];
}

export default async function RewardsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Rewards"
        subtitle="Live reward operations are blocked until the LMS is wired to a real production API, because fake points and queue state are not harmless fluff."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: rewards API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} the leaderboard, request queue, and manual XP corrections cannot be trusted. Fix the env var, redeploy, then verify live rewards data.
          </>
        )}
        whyBlocked={[
          'Rewards is not just a vanity leaderboard anymore. It exposes live request handling, manual XP corrections, and fulfillment state that operators can change.',
          'If production is pointed at localhost, a placeholder host, or no backend, a seemingly calm reward queue can hide dropped requests and fake adjustment success.',
        ]}
        verificationItems={[
          {
            surface: 'Leaderboard + queue',
            expected: 'Live XP, badges, reward requests, and queue health load from the backend',
            failure: 'Numbers look quiet only because the LMS never connected to the real API',
          },
          {
            surface: 'Manual adjustment lane',
            expected: 'Learner selectors and reward corrections submit against the live backend',
            failure: 'Operators think they fixed XP or badges when the deployment was disconnected the whole time',
          },
          {
            surface: 'Reward request handling',
            expected: 'Pending, approved, urgent, and fulfilled queue counts still match the live operational backlog after save',
            failure: 'Queue health is based on dead data or writes that never landed',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Reports blocker', href: '/reports', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const [studentsResult, catalogResult, leaderboardResult, queueResult] = await Promise.allSettled([
    fetchStudents(),
    fetchRewardsCatalog(),
    fetchRewardsLeaderboard(12),
    fetchRewardRequests(16),
  ]);

  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : EMPTY_CATALOG;
  const leaderboard: RewardSnapshot[] = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
  const queue = queueResult.status === 'fulfilled' ? queueResult.value : EMPTY_QUEUE;
  const failedSources = [
    studentsResult.status === 'rejected' ? 'learners' : null,
    catalogResult.status === 'rejected' ? 'rewards catalog' : null,
    leaderboardResult.status === 'rejected' ? 'leaderboard' : null,
    queueResult.status === 'rejected' ? 'reward queue' : null,
  ].filter(Boolean) as string[];
  const criticalRewardFailures = [
    studentsResult.status === 'rejected' ? 'learners' : null,
    catalogResult.status === 'rejected' ? 'rewards catalog' : null,
    leaderboardResult.status === 'rejected' ? 'leaderboard' : null,
    queueResult.status === 'rejected' ? 'reward queue' : null,
  ].filter(Boolean) as string[];

  if (criticalRewardFailures.length) {
    const blockerDetail = criticalRewardFailures.length === 1
      ? `The ${criticalRewardFailures[0]} feed failed to load from the live API. Leaving rewards up would make queue triage, XP corrections, and learner trust signals look safe while the control surface is blind.`
      : `The ${criticalRewardFailures.join(', ')} feeds failed to load from the live API. Leaving rewards up would make queue triage, XP corrections, and learner trust signals look safe while the control surface is blind.`;

    return (
      <DeploymentBlockerCard
        title="Rewards"
        subtitle="Rewards is an operational write surface, not a decorative leaderboard. If the core feeds are down, the route should block instead of rendering fake calm."
        blockerHeadline="Deployment blocker: reward operations feeds are degraded."
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length > criticalRewardFailures.length
              ? `Additional degraded feed${failedSources.length - criticalRewardFailures.length === 1 ? '' : 's'}: ${failedSources.filter((source) => !criticalRewardFailures.includes(source)).join(', ')}.`
              : ''}
          </>
        )}
        whyBlocked={[
          'Operators use this route to review live reward demand, approve fulfillment work, and make manual XP corrections. If learners, rewards catalog, leaderboard, or queue state disappears, a polished UI becomes dangerous fiction fast.',
          'The rewards catalog is part of the live reference graph here, not decorative garnish. If XP rules, levels, or badge definitions vanish, the route should stop cold instead of letting admins make “manual” changes blind.',
        ]}
        verificationItems={[
          {
            surface: 'Reward queue + leaderboard',
            expected: 'Live learner XP, queue backlog, and fulfillment status load from the real backend before any operator trusts the lane',
            failure: 'Quiet zero counts or empty queue rows appear while the core rewards feeds are degraded',
          },
          {
            surface: 'Manual reward corrections',
            expected: 'Operators can see real learners, XP ladder context, and badge definitions before changing rewards state',
            failure: 'Correction flows stay interactive while the learner, rewards catalog, or queue context is missing or stale',
          },
          {
            surface: 'Route trustworthiness',
            expected: 'Deployment review sees a blocker card until the core reward-operation feeds recover',
            failure: 'The route implies rewards operations are safe when the control surface is blind',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Reports blocker', href: '/reports', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const totalXp = leaderboard.reduce((sum, item) => sum + item.totalXp, 0);
  const totalBadges = leaderboard.reduce((sum, item) => sum + item.badgesUnlocked, 0);
  const topLearner = leaderboard[0] ?? null;

  return (
    <PageShell
      title="Rewards"
      subtitle="Live reward operations: leaderboard, XP catalog, request queue, and manual corrections. The route was blocked for pilot optics, not because the backend was missing."
      aside={(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/reports" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open reports
          </Link>
          <Link href="/settings" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#0f172a', color: 'white', textDecoration: 'none' }}>
            Open settings
          </Link>
        </div>
      )}
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Rewards is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Rewards pulse" eyebrow="Current live scope">
          <MetricList items={[
            { label: 'Learners on leaderboard', value: String(leaderboard.length) },
            { label: 'Total XP visible', value: String(totalXp) },
            { label: 'Badges unlocked', value: String(totalBadges) },
            { label: 'Top learner', value: topLearner?.learnerName ?? '—' },
          ]} />
        </Card>
        <Card title="Queue health" eyebrow="Requests needing hands">
          <MetricList items={[
            { label: 'Pending requests', value: String(queue.summary.pending) },
            { label: 'Approved waiting fulfillment', value: String(queue.summary.approved) },
            { label: 'Urgent backlog', value: String(queue.summary.urgentCount) },
            { label: 'Avg request age', value: `${queue.summary.averageAgeDays.toFixed(1)}d` },
          ]} />
        </Card>
        <Card title="Catalog coverage" eyebrow="What the reward engine exposes">
          <MetricList items={[
            { label: 'Level thresholds', value: String(catalog.levels.length) },
            { label: 'Badge types', value: String(catalog.badges.length) },
            { label: 'XP rules', value: String(Object.keys(catalog.xpRules || {}).length) },
            { label: 'Manual adjustment lane', value: students.length ? 'Ready' : 'Waiting for learners' },
          ]} />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16, marginBottom: 20 }}>
        <Card title="Leaderboard" eyebrow="Who is actually earning the climb">
          <SimpleTable
            columns={['Learner', 'XP', 'Badges', 'Recent']}
            rows={leaderboard.length ? leaderboard.map((item) => [
              <div key={item.learnerId} style={{ display: 'grid', gap: 6 }}>
                <strong>{item.learnerName ?? item.learnerId}</strong>
                <div style={{ color: '#64748b' }}>Level {item.level} · {item.levelLabel}</div>
              </div>,
              <strong key={`${item.learnerId}-xp`}>{item.totalXp}</strong>,
              <span key={`${item.learnerId}-badges`}>{item.badgesUnlocked}</span>,
              <div key={`${item.learnerId}-recent`} style={{ display: 'grid', gap: 6 }}>
                {item.recentTransactions.slice(0, 2).map((transaction) => (
                  <Pill key={transaction.id} label={`${transaction.label || transaction.kind} · ${transaction.xpDelta >= 0 ? '+' : ''}${transaction.xpDelta} XP`} tone={transaction.xpDelta >= 0 ? '#ECFDF5' : '#FFF7ED'} text={transaction.xpDelta >= 0 ? '#166534' : '#9A3412'} />
                ))}
              </div>,
            ]) : emptyRows('Leaderboard is unavailable right now.')}
          />
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card title="Level thresholds" eyebrow="Progression ladder">
            <div style={{ display: 'grid', gap: 10 }}>
              {catalog.levels.length ? catalog.levels.map((level, index) => (
                <div key={level.level} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{level.label}</strong>
                    <div style={{ color: '#64748b', marginTop: 4 }}>Level {level.level}</div>
                  </div>
                  <Pill label={levelRange(level, catalog.levels[index + 1])} tone="#EEF2FF" text="#3730A3" />
                </div>
              )) : <div style={{ color: '#64748b' }}>No level thresholds are visible right now.</div>}
            </div>
          </Card>

          <Card title="Badge catalog" eyebrow="Unlocked outcomes">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {catalog.badges.length ? catalog.badges.map((badge) => (
                <Pill key={badge.id} label={`${badge.title} · ${badge.category}`} tone="#F5F3FF" text="#6D28D9" />
              )) : <span style={{ color: '#64748b' }}>No badge catalog returned.</span>}
            </div>
          </Card>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <RewardRequestQueuePanel queue={queue} />
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        {students.length ? (
          <RewardsAdminForm students={students} catalog={catalog} leaderboard={leaderboard} />
        ) : (
          <Card title="Manual reward adjustment" eyebrow="Unavailable right now">
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>
              The admin correction lane needs visible learners first. Once the learner feed recovers, this route can patch XP and badge mistakes without sending ops on a scavenger hunt.
            </div>
          </Card>
        )}
      </section>
    </PageShell>
  );
}
