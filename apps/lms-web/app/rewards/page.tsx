import Link from 'next/link';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { RewardRequestQueuePanel } from '../../components/reward-request-queue-panel';
import { RewardsAdminForm } from '../../components/rewards-admin-form';
import { ExportShareCard } from '../../components/export-share-card';
import { fetchCohorts, fetchMallams, fetchPods, fetchRewardRequests, fetchRewardsCatalog, fetchRewardsLeaderboard, fetchRewardsReport, fetchStudents, fetchWorkboard } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import type { RewardCatalog } from '../../lib/rewards';
import type { RewardRequestQueue, RewardSnapshot, RewardsReport, Student, WorkboardItem } from '../../lib/types';

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
    count: 0,
    returned: 0,
  },
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

function statusTone(status: string) {
  if (status === 'ready') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'watch') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function rewardStatusTone(status: string) {
  if (status === 'fulfilled') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'approved') return { tone: '#DBEAFE', text: '#1D4ED8' };
  if (status === 'expired' || status === 'rejected' || status === 'cancelled') return { tone: '#FEE2E2', text: '#991B1B' };
  return { tone: '#FEF3C7', text: '#92400E' };
}

function badgeProgressLabel(snapshot: RewardSnapshot, badgeId: string) {
  const badge = snapshot.badges.find((item) => item.id === badgeId);
  if (!badge) return 'No learner progress yet';
  if (badge.earned) return 'Unlocked';
  return `${Math.min(badge.progress, badge.target)}/${badge.target} progress`;
}

function normalizeFilterValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const haystack = values.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function buildScopeLabel({ cohortName, podLabel, mallamName }: { cohortName?: string; podLabel?: string; mallamName?: string }) {
  const parts = [cohortName, podLabel, mallamName].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'All cohorts • all pods • all mallams';
}

function buildFilterChips({ searchText, cohortName, podLabel, mallamName, statusLabel }: { searchText?: string; cohortName?: string | null; podLabel?: string | null; mallamName?: string | null; statusLabel?: string | null }) {
  return [
    searchText ? `Search: ${searchText}` : null,
    cohortName ? `Cohort: ${cohortName}` : null,
    podLabel ? `Pod: ${podLabel}` : null,
    mallamName ? `Mallam: ${mallamName}` : null,
    statusLabel ? `Status: ${statusLabel}` : null,
  ].filter(Boolean) as string[];
}

function csvEscape(value: string | number) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

export default async function RewardsPage({ searchParams }: { searchParams?: Promise<{ message?: string; q?: string | string[]; cohort?: string | string[]; pod?: string | string[]; mallam?: string | string[]; status?: string | string[] }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Rewards & Progression"
        subtitle="Production wiring is incomplete, so reward operations and progression cues are blocked instead of pretending the incentive system is trustworthy."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: rewards API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} leaderboard ranks, reward queue pressure, manual XP interventions, and progression-linked reward decisions would all degrade into convincing nonsense. Fix the env var, redeploy, then verify live reward and progression data before touching learner incentives.
          </>
        )}
        whyBlocked={[
          'This route is not a passive dashboard. It can drive manual reward adjustments, queue decisions, and progression-adjacent operator actions, so fake-empty states here are operationally dangerous.',
          'Without the production API base, the leaderboard, reward queue, analytics, learner roster scope, and progression workboard cannot be trusted together on this page.',
          'Blocking here prevents reviewers from mistaking a polished rewards cockpit for a live incentive system when the backend is actually disconnected.',
        ]}
        verificationItems={[
          {
            surface: 'Reward queue',
            expected: 'Pending, approved, urgent, expired, and fulfilled requests load with real learner and timestamp data',
            failure: 'Queue looks calm or empty even though the backend is not connected',
          },
          {
            surface: 'Leaderboard + progression',
            expected: 'XP totals, badges, readiness states, and next moves align with live learner data',
            failure: 'Learners appear on-track or unranked because fallback values replaced real progression state',
          },
          {
            surface: 'Manual reward controls',
            expected: 'Adjustment forms only appear once live learner scope, catalog rules, and reward operations are loaded',
            failure: 'Operators can open reward actions while roster or catalog data is missing',
          },
        ]}
        docs={[
          { label: 'Reports blocker', href: '/reports', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Settings blocker', href: '/settings', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
          { label: 'Dashboard blocker', href: '/', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const searchText = normalizeFilterValue(query?.q).trim().toLowerCase();
  const cohortFilter = normalizeFilterValue(query?.cohort).trim();
  const podFilter = normalizeFilterValue(query?.pod).trim();
  const mallamFilter = normalizeFilterValue(query?.mallam).trim();
  const statusFilter = normalizeFilterValue(query?.status).trim();

  const [catalogResult, leaderboardResult, queueResult, workboardResult, studentsResult, cohortsResult, podsResult, mallamsResult, rewardsReportResult] = await Promise.allSettled([
    fetchRewardsCatalog(),
    fetchRewardsLeaderboard(50, {
      cohortId: cohortFilter || undefined,
      podId: podFilter || undefined,
      mallamId: mallamFilter || undefined,
    }),
    fetchRewardRequests(24, {
      cohortId: cohortFilter || undefined,
      podId: podFilter || undefined,
      mallamId: mallamFilter || undefined,
      status: statusFilter || undefined,
    }),
    fetchWorkboard(),
    fetchStudents(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
    fetchRewardsReport(24, {
      cohortId: cohortFilter || undefined,
      podId: podFilter || undefined,
      mallamId: mallamFilter || undefined,
    }),
  ]);

  const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : EMPTY_CATALOG;
  const leaderboard: RewardSnapshot[] = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
  const rewardQueue: RewardRequestQueue = queueResult.status === 'fulfilled' ? queueResult.value : EMPTY_QUEUE;
  const workboard: WorkboardItem[] = workboardResult.status === 'fulfilled' ? workboardResult.value : [];
  const students: Student[] = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const rewardsReport: RewardsReport = rewardsReportResult.status === 'fulfilled' ? rewardsReportResult.value : EMPTY_REWARDS_REPORT;
  const queueAvailable = queueResult.status === 'fulfilled';
  const analyticsAvailable = rewardsReportResult.status === 'fulfilled';
  const leaderboardAvailable = leaderboardResult.status === 'fulfilled';
  const rosterAvailable = studentsResult.status === 'fulfilled';

  const failedSources = [
    catalogResult.status === 'rejected' ? 'reward catalog' : null,
    leaderboardResult.status === 'rejected' ? 'leaderboard' : null,
    queueResult.status === 'rejected' ? 'reward queue' : null,
    workboardResult.status === 'rejected' ? 'progression workboard' : null,
    studentsResult.status === 'rejected' ? 'learner roster' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    rewardsReportResult.status === 'rejected' ? 'reward analytics' : null,
  ].filter(Boolean);
  const totalFeeds = 9;
  const healthyFeeds = totalFeeds - failedSources.length;
  const availableSurfaces = [
    queueResult.status === 'fulfilled' ? 'queue triage' : null,
    leaderboardResult.status === 'fulfilled' ? 'leaderboard visibility' : null,
    workboardResult.status === 'fulfilled' ? 'progression posture' : null,
    rewardsReportResult.status === 'fulfilled' ? 'reward analytics' : null,
    studentsResult.status === 'fulfilled' ? 'learner-scoped filtering' : null,
    catalogResult.status === 'fulfilled' && studentsResult.status === 'fulfilled' ? 'manual reward adjustments' : null,
  ].filter(Boolean) as string[];
  const unavailableCapabilities = [
    queueResult.status === 'rejected' ? 'queue actions and backlog review' : null,
    leaderboardResult.status === 'rejected' ? 'live XP ranking and badge comparisons' : null,
    workboardResult.status === 'rejected' ? 'progression readiness guidance' : null,
    rewardsReportResult.status === 'rejected' ? 'trend and demand analytics' : null,
    studentsResult.status === 'rejected' ? 'safe learner targeting for manual reward writes' : null,
    catalogResult.status === 'rejected' ? 'catalog-aware reward controls' : null,
  ].filter(Boolean) as string[];

  const filteredStudents = students.filter((student) => {
    const cohortMatches = !cohortFilter || student.cohortId === cohortFilter;
    const podMatches = !podFilter || student.podId === podFilter;
    const mallamMatches = !mallamFilter || student.mallamId === mallamFilter;
    const queryMatches = matchesQuery([student.name, student.cohortName, student.podLabel, student.mallamName], searchText);
    return cohortMatches && podMatches && mallamMatches && queryMatches;
  });
  const filteredWorkboard = workboard.filter((item) => {
    const student = students.find((entry) => entry.name === item.studentName);
    const cohortMatches = !cohortFilter || student?.cohortId === cohortFilter;
    const podMatches = !podFilter || student?.podId === podFilter;
    const mallamMatches = !mallamFilter || student?.mallamId === mallamFilter;
    const statusMatches = !statusFilter || item.progressionStatus === statusFilter;
    const queryMatches = matchesQuery([item.studentName, item.cohortName, item.podLabel, item.mallamName, item.focus, item.recommendedNextModuleTitle], searchText);
    return cohortMatches && podMatches && mallamMatches && statusMatches && queryMatches;
  });
  const filteredLeaderboard = leaderboard.filter((item) => {
    const student = students.find((entry) => entry.id === item.learnerId || entry.name === item.learnerName);
    const workboardEntry = filteredWorkboard.find((entry) => entry.studentName === (item.learnerName ?? student?.name));
    const cohortMatches = !cohortFilter || student?.cohortId === cohortFilter || item.cohortId === cohortFilter;
    const podMatches = !podFilter || !students.length || student?.podId === podFilter;
    const mallamMatches = !mallamFilter || !students.length || student?.mallamId === mallamFilter;
    const statusMatches = !statusFilter || workboardEntry?.progressionStatus === statusFilter;
    const queryMatches = matchesQuery([item.learnerName, student?.cohortName, student?.podLabel, student?.mallamName, workboardEntry?.recommendedNextModuleTitle, item.levelLabel], searchText);
    return cohortMatches && podMatches && mallamMatches && statusMatches && queryMatches;
  });

  const filteredLearnerIds = new Set(filteredStudents.map((student) => student.id));
  const filteredDemand = rewardsReport.rewardDemand.filter((item) => !searchText || matchesQuery([item.rewardTitle], searchText));
  const filteredQueue = rewardQueue.items.filter((item) => {
    const student = students.find((entry) => entry.id === item.studentId || entry.name === item.learnerName);
    const cohortMatches = !cohortFilter || !students.length || student?.cohortId === cohortFilter;
    const podMatches = !podFilter || !students.length || student?.podId === podFilter;
    const mallamMatches = !mallamFilter || !students.length || student?.mallamId === mallamFilter;
    const statusMatches = !statusFilter || item.status === statusFilter;
    const queryMatches = matchesQuery([item.learnerName, item.rewardTitle, student?.cohortName, student?.podLabel, student?.mallamName], searchText);
    return cohortMatches && podMatches && mallamMatches && statusMatches && queryMatches;
  });
  const filteredAdjustments = rewardsReport.recentAdjustments.filter((entry) => {
    const record = asRecord(entry);
    if (!record) return false;
    const studentId = typeof record.studentId === 'string' ? record.studentId : '';
    const learnerMatches = !filteredLearnerIds.size || filteredLearnerIds.has(studentId);
    const queryMatches = matchesQuery([
      typeof record.learnerName === 'string' ? record.learnerName : null,
      typeof record.label === 'string' ? record.label : null,
      typeof record.reason === 'string' ? record.reason : null,
      typeof record.note === 'string' ? record.note : null,
    ], searchText);
    return learnerMatches && queryMatches;
  }).slice(0, 8);
  const scopedQueue: RewardRequestQueue = queueAvailable
    ? {
        ...rewardQueue,
        items: filteredQueue,
        summary: {
          total: filteredQueue.length,
          pending: filteredQueue.filter((item) => item.status === 'pending').length,
          approved: filteredQueue.filter((item) => item.status === 'approved').length,
          fulfilled: filteredQueue.filter((item) => item.status === 'fulfilled').length,
          rejected: filteredQueue.filter((item) => item.status === 'rejected').length,
          cancelled: filteredQueue.filter((item) => item.status === 'cancelled').length,
          expired: filteredQueue.filter((item) => item.status === 'expired').length,
          attentionCount: filteredQueue.filter((item) => (item.ageDays ?? 0) >= 1).length,
          urgentCount: filteredQueue.filter((item) => (item.ageDays ?? 0) >= 3).length,
          averageAgeDays: filteredQueue.length ? filteredQueue.reduce((sum, item) => sum + (item.ageDays ?? 0), 0) / filteredQueue.length : 0,
        },
        meta: {
          count: filteredQueue.length,
          returned: filteredQueue.length,
        },
      }
    : EMPTY_QUEUE;
  const filtersActive = Boolean(searchText || cohortFilter || podFilter || mallamFilter || statusFilter);

  const highestLevel = filteredLeaderboard.length ? Math.max(...filteredLeaderboard.map((item) => item.level)) : 0;
  const totalXp = filteredLeaderboard.reduce((sum, item) => sum + item.totalXp, 0);
  const totalBadges = filteredLeaderboard.reduce((sum, item) => sum + item.badgesUnlocked, 0);
  const readyLearners = filteredWorkboard.filter((item) => item.progressionStatus === 'ready').length;
  const watchLearners = filteredWorkboard.filter((item) => item.progressionStatus === 'watch').length;
  const onTrackLearners = filteredWorkboard.filter((item) => item.progressionStatus === 'on-track').length;
  const selectedCohort = cohorts.find((cohort) => cohort.id === cohortFilter) ?? null;
  const selectedPod = pods.find((pod) => pod.id === podFilter) ?? null;
  const selectedMallam = mallams.find((mallam) => mallam.id === mallamFilter) ?? null;
  const statusLabelMap: Record<string, string> = {
    'on-track': 'On track',
    watch: 'Watch',
    ready: 'Ready',
    pending: 'Pending reward request',
    approved: 'Approved reward request',
    fulfilled: 'Fulfilled reward request',
    expired: 'Expired reward request',
  };
  const selectedStatusLabel = statusFilter ? (statusLabelMap[statusFilter] ?? statusFilter) : null;
  const scopeLabel = buildScopeLabel({ cohortName: selectedCohort?.name, podLabel: selectedPod?.label, mallamName: selectedMallam?.displayName });
  const activeFilterChips = buildFilterChips({
    searchText: searchText || undefined,
    cohortName: selectedCohort?.name,
    podLabel: selectedPod?.label,
    mallamName: selectedMallam?.displayName,
    statusLabel: selectedStatusLabel,
  });
  const trustState = failedSources.length
    ? availableSurfaces.length
      ? 'Partial live ops view'
      : 'Rewards feeds down — operator review required'
    : filtersActive
      ? 'Scoped reward snapshot'
      : 'Live reward operations view';
  const trustDetail = failedSources.length
    ? `${healthyFeeds}/${totalFeeds} reward feeds responded. Down right now: ${failedSources.join(', ')}. Still usable: ${availableSurfaces.length ? availableSurfaces.join(', ') : 'no operator-safe surfaces'}. ${unavailableCapabilities.length ? `Unavailable: ${unavailableCapabilities.join(', ')}.` : ''}`
    : filtersActive
      ? `This board is intentionally scoped to ${scopeLabel}. That makes it shareable for a real decision, not just a noisy full-system screenshot.`
      : 'All visible reward, queue, roster, and progression feeds loaded. This is safe to use as the full operating picture.';
  const rewardDateStamp = new Date().toISOString().slice(0, 10);
  const rewardNarrative = [
    `Rewards scope: ${scopeLabel}.`,
    `${filteredLeaderboard.length} leaderboard learner${filteredLeaderboard.length === 1 ? '' : 's'} are visible with ${totalXp} total XP and ${totalBadges} unlocked badge${totalBadges === 1 ? '' : 's'}.`,
    `${readyLearners} learner${readyLearners === 1 ? '' : 's'} are progression-ready, ${watchLearners} remain on watch, and ${onTrackLearners} are on track.`,
    queueAvailable
      ? `${filteredQueue.length} reward request${filteredQueue.length === 1 ? '' : 's'} are in scope, with ${scopedQueue.summary.urgentCount} urgent and ${scopedQueue.summary.attentionCount} needing attention overall.`
      : 'Reward queue feed is unavailable, so queue pressure and fulfillment decisions need manual verification before ops touches any request.',
    failedSources.length ? `Trust warning: ${trustDetail}` : 'Trust status: reward, progression, and roster data all loaded for this view.',
  ].join('\n');
  const rewardShareText = [
    `Lumo rewards snapshot · ${scopeLabel}`,
    `${filteredLeaderboard.length} learners visible · ${readyLearners} ready · ${watchLearners} watch.`,
    queueAvailable
      ? `${filteredQueue.length} reward requests in scope with ${scopedQueue.summary.urgentCount} urgent and ${scopedQueue.summary.expired} expired.`
      : 'Reward queue feed is unavailable in this snapshot.',
    failedSources.length ? `Caution: ${trustDetail}` : 'All core reward feeds loaded for this snapshot.',
    filteredQueue[0] ? `Top queue item: ${filteredQueue[0].rewardTitle} for ${filteredQueue[0].learnerName ?? filteredQueue[0].studentId} (${filteredQueue[0].status}).` : 'No queue item is dominating the board right now.',
  ].join('\n');
  const rewardCsv = toCsv([
    ['Scope', 'Learners', 'Total XP', 'Badges', 'Ready', 'Watch', 'On track', 'Queue items', 'Urgent', 'Expired'],
    [scopeLabel, filteredLeaderboard.length, totalXp, totalBadges, readyLearners, watchLearners, onTrackLearners, filteredQueue.length, scopedQueue.summary.urgentCount, scopedQueue.summary.expired],
    [],
    ['Learner', 'Level', 'XP', 'Badges', 'Next move', 'Progression'],
    ...filteredLeaderboard.map((item) => {
      const workboardEntry = filteredWorkboard.find((entry) => entry.studentName === item.learnerName);
      return [
        item.learnerName ?? item.learnerId,
        `${item.level} · ${item.levelLabel}`,
        item.totalXp,
        item.badgesUnlocked,
        workboardEntry?.recommendedNextModuleTitle ?? item.nextLevelLabel ?? 'Keep building',
        workboardEntry?.progressionStatus ?? 'on-track',
      ];
    }),
    [],
    ['Requested at', 'Learner', 'Reward', 'Status', 'XP cost', 'Age days'],
    ...filteredQueue.map((item) => [
      formatDate(item.createdAt),
      item.learnerName ?? item.studentId,
      item.rewardTitle,
      item.status,
      item.xpCost,
      item.ageDays != null ? item.ageDays.toFixed(1) : '—',
    ]),
  ]);
  const rewardJson = JSON.stringify({
    generatedAt: new Date().toISOString(),
    trustState,
    trustDetail,
    scope: {
      label: scopeLabel,
      searchText: searchText || null,
      cohortId: cohortFilter || null,
      podId: podFilter || null,
      mallamId: mallamFilter || null,
      status: statusFilter || null,
    },
    summary: {
      leaderboardLearners: filteredLeaderboard.length,
      totalXp,
      totalBadges,
      readyLearners,
      watchLearners,
      onTrackLearners,
      queueItems: filteredQueue.length,
      urgentQueueItems: scopedQueue.summary.urgentCount,
      expiredQueueItems: scopedQueue.summary.expired,
    },
    leaderboard: filteredLeaderboard,
    queue: filteredQueue,
    adjustments: filteredAdjustments,
  }, null, 2);

  return (
    <PageShell
      title="Rewards & Progression"
      subtitle="The admin surface for XP rules, levels, badges, queue expiry, manual corrections, and the learners who are actually moving — not just collecting decorative points."
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/reports" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#ECFDF5', color: '#166534', textDecoration: 'none' }}>
            Open reporting board
          </Link>
          <Link href="/settings" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open ops control center
          </Link>
          <Link href="/english" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
            Open English Studio
          </Link>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(67,20,7,0.98) 0%, rgba(88,28,12,0.94) 100%)', border: '1px solid rgba(251,146,60,0.32)', color: '#fed7aa', display: 'grid', gap: 6, boxShadow: '0 18px 32px rgba(15,23,42,0.18)' }}>
          <div style={{ fontWeight: 800 }}>Rewards is running with partial data.</div>
          <div style={{ lineHeight: 1.6 }}>
            {healthyFeeds}/{totalFeeds} feeds responded. Down or stale right now: <strong>{failedSources.join(', ')}</strong>.
          </div>
          <div style={{ lineHeight: 1.6, fontSize: 14, color: '#fdba74' }}>
            Still usable: {availableSurfaces.length ? availableSurfaces.join(', ') : 'no operator-safe surface yet'}. {unavailableCapabilities.length ? `Hold off on ${unavailableCapabilities.join(', ')} until those feeds recover.` : 'No extra capability gaps are visible beyond the named feed failures.'}
          </div>
        </div>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <Card title="Rewards filters" eyebrow="Same scoping discipline as the other admin boards">
          <form style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...responsiveGrid(220), gap: 12 }}>
              <input name="q" defaultValue={searchText} placeholder="Search learner, pod, mallam, reward, or next move" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
              <select name="cohort" defaultValue={cohortFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All cohorts</option>
                {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
              </select>
              <select name="pod" defaultValue={podFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All pods</option>
                {pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}
              </select>
              <select name="mallam" defaultValue={mallamFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All mallams</option>
                {mallams.map((mallam) => <option key={mallam.id} value={mallam.id}>{mallam.displayName}</option>)}
              </select>
              <select name="status" defaultValue={statusFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All progression / queue states</option>
                <option value="on-track">On track</option>
                <option value="watch">Watch</option>
                <option value="ready">Ready</option>
                <option value="pending">Pending reward request</option>
                <option value="approved">Approved reward request</option>
                <option value="fulfilled">Fulfilled reward request</option>
                <option value="expired">Expired reward request</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}>Apply filters</button>
              <a href="/rewards" style={{ borderRadius: 12, padding: '12px 16px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>Clear filters</a>
            </div>
          </form>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16, marginBottom: 20 }}>
        <Card title="Reward trust center" eyebrow="Operational truth before you share it">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ padding: '18px 20px', borderRadius: 18, background: failedSources.length ? '#fff7ed' : filtersActive ? '#EEF2FF' : '#ECFDF5', border: `1px solid ${failedSources.length ? '#fed7aa' : filtersActive ? '#c7d2fe' : '#bbf7d0'}` }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800, marginBottom: 8 }}>Trust status</div>
              <strong style={{ display: 'block', fontSize: 22, color: '#0f172a', marginBottom: 6 }}>{trustState}</strong>
              <div style={{ color: '#475569', lineHeight: 1.7 }}>{trustDetail}</div>
            </div>
            <div style={{ ...responsiveGrid(180), gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>Scope</div>
                <strong>{scopeLabel}</strong>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>Queue pressure</div>
                <strong>{queueAvailable ? `${filteredQueue.length} in scope · ${scopedQueue.summary.urgentCount} urgent` : 'Queue feed unavailable'}</strong>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>Progression reality</div>
                <strong>{readyLearners} ready · {watchLearners} watch</strong>
              </div>
            </div>
            {activeFilterChips.length ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {activeFilterChips.map((chip) => (
                  <Pill key={chip} label={chip} tone="#F8FAFC" text="#334155" />
                ))}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/reports" style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
                Cross-check in reports →
              </Link>
              <Link href="/settings" style={{ color: '#166534', fontWeight: 800, textDecoration: 'none' }}>
                Open ops control center →
              </Link>
            </div>
          </div>
        </Card>

        <ExportShareCard
          title="Export and share"
          eyebrow="Rewards handoff pack"
          summary="Copy the scoped reward summary, share it from mobile, or download lightweight artifacts for ops, finance, or partner updates without rebuilding the same snapshot by hand."
          shareTitle={`Lumo rewards · ${scopeLabel}`}
          shareText={rewardShareText}
          artifacts={[
            { label: 'Download summary (.txt)', filename: `lumo-rewards-${rewardDateStamp}.txt`, mimeType: 'text/plain', content: rewardNarrative, tone: '#EEF2FF', text: '#3730A3' },
            { label: 'Download queue + leaderboard (.csv)', filename: `lumo-rewards-${rewardDateStamp}.csv`, mimeType: 'text/csv', content: rewardCsv, tone: '#ECFDF5', text: '#166534' },
            { label: 'Download JSON snapshot', filename: `lumo-rewards-${rewardDateStamp}.json`, mimeType: 'application/json', content: rewardJson, tone: '#FFF7ED', text: '#9A3412' },
          ]}
        />
      </section>

      {filtersActive ? (
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <div style={{ marginBottom: 0, color: '#475569', fontWeight: 700 }}>
            Showing {filteredLeaderboard.length} leaderboard learner{filteredLeaderboard.length === 1 ? '' : 's'} and {filteredQueue.length} reward queue item{filteredQueue.length === 1 ? '' : 's'} in the current scope.
          </div>
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Reward footprint" eyebrow="Live system pulse">
          <MetricList
            items={[
              { label: 'Leaderboard learners', value: String(filteredLeaderboard.length) },
              { label: 'Total XP tracked', value: String(totalXp) },
              { label: 'Badges unlocked', value: String(totalBadges) },
              { label: 'Highest level reached', value: String(highestLevel) },
            ]}
          />
        </Card>

        <Card title="Queue pressure" eyebrow="Expiry + fulfillment reality">
          <MetricList
            items={[
              { label: 'Pending requests', value: queueAvailable ? String(scopedQueue.summary.pending) : 'Unavailable' },
              { label: 'Urgent backlog', value: queueAvailable ? String(scopedQueue.summary.urgentCount) : 'Unavailable' },
              { label: 'Needs attention', value: queueAvailable ? String(scopedQueue.summary.attentionCount) : 'Unavailable' },
              { label: 'Expired requests', value: queueAvailable ? String(scopedQueue.summary.expired) : 'Unavailable' },
            ]}
          />
        </Card>

        <Card title="Progression posture" eyebrow="Promotion reality">
          <MetricList
            items={[
              { label: 'Ready learners', value: String(readyLearners) },
              { label: 'Watchlist learners', value: String(filteredWorkboard.filter((item) => item.progressionStatus === 'watch').length) },
              { label: 'On-track learners', value: String(filteredWorkboard.filter((item) => item.progressionStatus === 'on-track').length) },
              { label: 'Configured badges', value: String(catalog.badges.length) },
            ]}
          />
        </Card>

        <Card title="Reward analytics" eyebrow="System behavior, not wishful thinking">
          <MetricList
            items={[
              { label: 'Fulfillment rate', value: analyticsAvailable ? `${Math.round(rewardsReport.summary.fulfillmentRate * 100)}%` : 'Unavailable' },
              { label: 'Transactions logged', value: analyticsAvailable ? String(rewardsReport.summary.transactionCount) : 'Unavailable' },
              { label: 'Corrections made', value: analyticsAvailable ? String(rewardsReport.summary.correctionCount) : 'Unavailable' },
              { label: 'Revocations made', value: analyticsAvailable ? String(rewardsReport.summary.revocationCount) : 'Unavailable' },
            ]}
          />
        </Card>
      </section>

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        {queueAvailable ? (
          <RewardRequestQueuePanel queue={scopedQueue} />
        ) : (
          <Card title="Reward queue" eyebrow="Feed unavailable">
            <div style={{ display: 'grid', gap: 10, color: '#9a3412', lineHeight: 1.7 }}>
              <div>The reward queue feed is down, so approvals, fulfillment, requeue, and expiry controls are intentionally hidden instead of pretending there is nothing to do.</div>
              <div>Restore <strong>/api/v1/rewards/requests</strong> before anyone touches learner redemptions from this board.</div>
            </div>
          </Card>
        )}

        {rosterAvailable && filteredStudents.length ? (
          <RewardsAdminForm students={filteredStudents} catalog={catalog} leaderboard={filteredLeaderboard} />
        ) : (
          <Card title="Reward adjustments" eyebrow="Unavailable right now">
            <div style={{ color: rosterAvailable ? '#64748b' : '#9a3412', lineHeight: 1.6 }}>
              {!rosterAvailable
                ? 'Learner roster feed is unavailable, so manual reward writes stay disabled instead of guessing who gets changed.'
                : filtersActive
                  ? 'No learners match the current scope, so manual reward writes stay disabled instead of guessing.'
                  : 'Reward write controls are paused until the learner roster loads again. No roster, no safe manual award.'}
            </div>
          </Card>
        )}

        <Card title="Operator guidance" eyebrow="Use the system like an adult">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['XP should follow mastery', 'Keep XP linked to lesson completion, evidence, and review quality. If points outrun real learning, the whole ladder becomes theatre.'],
              ['Queue debt is still debt', 'Approved-but-never-fulfilled rewards are not harmless. They teach learners the system says yes and then disappears. Expire or fulfill them on purpose.'],
              ['Badges need narrative weight', 'A badge should mark a behavior worth celebrating: first completion, streak, reading confidence, numeracy momentum. Not random clicking.'],
              ['Mallams need visible reasons', 'When a learner levels up or stalls, the workboard should make the reason obvious so the teaching team is not stuck guessing.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Reward demand" eyebrow="What learners actually want">
          <SimpleTable
            columns={['Reward', 'Requests', 'Pending', 'Fulfilled']}
            rows={filteredDemand.length ? filteredDemand.map((item) => [
              item.rewardTitle,
              String(item.requests),
              String(item.pending),
              String(item.fulfilled),
            ]) : [[<span key="empty" style={{ color: '#64748b' }}>{filtersActive ? 'No reward demand records match the current scope.' : 'Reward demand analytics unavailable.'}</span>, '', '', '']]}
          />
        </Card>

        <Card title="Recent reward adjustments" eyebrow="Audit trail with teeth">
          <SimpleTable
            columns={['When', 'Reason', 'Learner', 'Signal']}
            rows={filteredAdjustments.length ? filteredAdjustments.map((entry, index) => {
              const record = asRecord(entry) ?? {};
              const reason = typeof record.reason === 'string' ? record.reason : typeof record.kind === 'string' ? record.kind : 'adjustment';
              const learnerName = typeof record.learnerName === 'string'
                ? record.learnerName
                : typeof record.studentName === 'string'
                  ? record.studentName
                  : typeof record.studentId === 'string'
                    ? record.studentId
                    : '—';
              const note = typeof record.note === 'string' ? record.note : typeof record.label === 'string' ? record.label : 'Audit note unavailable';
              return [
                formatDate(record.createdAt),
                <div key={`reason-${index}`}>
                  <div style={{ fontWeight: 700 }}>{reason}</div>
                  <div style={{ color: '#64748b', marginTop: 4 }}>{note}</div>
                </div>,
                learnerName,
                <Pill key={`pill-${index}`} label={reason.replace(/_/g, ' ')} tone="#EEF2FF" text="#3730A3" />,
              ];
            }) : [[<span key="empty" style={{ color: '#64748b' }}>{filtersActive ? 'No reward adjustment records match the current scope.' : 'No reward adjustments have been logged yet.'}</span>, '', '', '']]}
          />
        </Card>
      </section>

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Level ladder" eyebrow="How progression pacing works">
          <div style={{ display: 'grid', gap: 12 }}>
            {catalog.levels.length ? catalog.levels.map((level, index) => (
              <div key={level.level} style={{ padding: 16, borderRadius: 18, background: index === catalog.levels.length - 1 ? '#faf5ff' : '#f8fafc', border: `1px solid ${index === catalog.levels.length - 1 ? '#e9d5ff' : '#eef2f7'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <strong>Level {level.level} · {level.label}</strong>
                  <Pill label={`${level.minXp}+ XP`} tone={index === catalog.levels.length - 1 ? '#F3E8FF' : '#EEF2FF'} text={index === catalog.levels.length - 1 ? '#7E22CE' : '#3730A3'} />
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                  {index === catalog.levels.length - 1
                    ? 'Top rung in the current ladder. If too many learners pile up here, add the next tier instead of pretending progression magically solved itself.'
                    : `Unlocks the ${catalog.levels[index + 1].label} tier at ${catalog.levels[index + 1].minXp} XP.`}
                </div>
              </div>
            )) : (
              <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#64748b' }}>
                Level rules are unavailable right now.
              </div>
            )}
          </div>
        </Card>

        <Card title="Badge catalogue" eyebrow="What learners can earn">
          <SimpleTable
            columns={['Badge', 'Category', 'Unlock rule', 'Live signal']}
            rows={catalog.badges.length ? catalog.badges.map((badge) => {
              const unlocked = filteredLeaderboard.filter((item) => item.badges.some((entry) => entry.id === badge.id && entry.earned)).length;
              const nearestLearner = filteredLeaderboard[0] ? badgeProgressLabel(filteredLeaderboard[0], badge.id) : 'No learner progress yet';

              return [
                <div key={`${badge.id}-title`}>
                  <div style={{ fontWeight: 800 }}>{badge.title}</div>
                  <div style={{ color: '#64748b', marginTop: 4 }}>{badge.description}</div>
                </div>,
                badge.category,
                `${badge.target} ${badge.target === 1 ? 'milestone' : 'milestones'} needed`,
                `${unlocked} unlocked · lead learner: ${nearestLearner}`,
              ];
            }) : [[<span key="empty" style={{ color: '#64748b' }}>Badge catalog unavailable.</span>, '', '', '']]}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 16, marginBottom: 20 }}>
        <Card title="Leaderboard" eyebrow="Who is actually moving">
          <SimpleTable
            columns={['Learner', 'Level', 'XP status', 'Badges', 'Next move', 'Progression']}
            rows={filteredLeaderboard.length ? filteredLeaderboard.map((item) => {
              const workboardEntry = filteredWorkboard.find((entry) => entry.studentName === item.learnerName);
              const tone = statusTone(workboardEntry?.progressionStatus ?? 'on-track');

              return [
                item.learnerName ?? item.learnerId,
                `${item.level} · ${item.levelLabel}`,
                `${item.totalXp} total · ${item.xpForNextLevel} to next`,
                `${item.badgesUnlocked} unlocked`,
                workboardEntry?.recommendedNextModuleTitle ?? item.nextLevelLabel ?? 'Keep building',
                <Pill key={item.learnerId} label={workboardEntry?.progressionStatus ?? 'on-track'} tone={tone.tone} text={tone.text} />,
              ];
            }) : [[<span key="empty" style={{ color: '#64748b' }}>{filtersActive ? 'No leaderboard records match the current filters.' : 'Reward leaderboard unavailable.'}</span>, '', '', '', '', '']]}
          />
        </Card>

        <Card title="Queue watchlist" eyebrow="What needs a human now">
          <div style={{ display: 'grid', gap: 12 }}>
            {filteredQueue.length ? filteredQueue.slice(0, 6).map((item) => {
              const tone = rewardStatusTone(item.status);
              return (
                <div key={item.id} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <strong>{item.rewardTitle}</strong>
                    <Pill label={item.status} tone={tone.tone} text={tone.text} />
                  </div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                    {(item.learnerName ?? item.studentId)} • {item.xpCost} XP • requested {formatDate(item.createdAt)}
                    {item.ageDays != null ? ` • ${item.ageDays.toFixed(1)}d old` : ''}
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: 16, borderRadius: 18, background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534', lineHeight: 1.6 }}>
                No reward queue items are visible in the current scope.
              </div>
            )}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
