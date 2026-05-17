import Link from 'next/link';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchNgoSummary, fetchOperationsReport, fetchReportsOverview, fetchRewardsReport } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import type { NgoSummary, OperationsReport, ReportsOverview, RewardsReport } from '../../lib/types';

const EMPTY_OVERVIEW: ReportsOverview = {
  totalStudents: 0,
  totalTeachers: 0,
  totalCenters: 0,
  totalAssignments: 0,
  presentToday: 0,
  averageAttendance: 0,
  averageMastery: 0,
  readinessCount: 0,
  watchCount: 0,
  onTrackCount: 0,
  assignmentsDueThisWeek: 0,
  activePods: 0,
  podsNeedingAttention: 0,
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

const EMPTY_NGO_SUMMARY: NgoSummary = {
  scope: { learnerCount: 0 },
  totals: {
    learners: 0,
    centers: 0,
    pods: 0,
    mallams: 0,
    activeAssignments: 0,
    lessonsCompleted: 0,
    completedSessions: 0,
    attendanceAverage: 0,
    averageMastery: 0,
    totalXpAwarded: 0,
  },
  progression: {
    ready: 0,
    watch: 0,
    onTrack: 0,
  },
  subjectBreakdown: [],
  mallamSnapshots: [],
  topLearners: [],
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

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function jsonCell(value: unknown) {
  if (!value) return '—';
  return JSON.stringify(value);
}

function emptyRows(message: string) {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '']];
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Reports"
        subtitle="Reporting is deployment-critical because zeroed programme metrics are worse than a loud blocker card."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: reports API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} reports would otherwise render polished zeroes and fake calm while delivery, rewards, or progression evidence is actually unavailable.
          </>
        )}
        whyBlocked={[
          'The reports route drives programme health, reward throughput, and progression evidence. If the API target is unsafe, showing zero-value cards would be a lie with deployment-review consequences.',
          'This surface used to fall back to empty report objects. Blocking up front is safer than letting a broken backend look like a quiet day.',
        ]}
        verificationItems={[
          {
            surface: 'Programme snapshot',
            expected: 'Learners, teachers, centers, attendance, and mastery load from the live backend',
            failure: 'Neat zero-value report cards or empty tables render against a bad or missing API target',
          },
          {
            surface: 'Reward + operations reports',
            expected: 'Reward demand, runtime risk, and integrity signals reflect live data',
            failure: 'Queue, runtime, or integrity sections quietly flatten into fallback placeholders',
          },
          {
            surface: 'Deployment review flow',
            expected: 'Operators can verify real reporting evidence before calling the LMS production-ready',
            failure: 'The route implies a healthy reporting stack while the API wiring is broken',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Rewards', href: '/rewards', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const [overviewResult, rewardsResult, ngoResult, operationsResult] = await Promise.allSettled([
    fetchReportsOverview(),
    fetchRewardsReport(10),
    fetchNgoSummary(),
    fetchOperationsReport(10),
  ]);

  const overview = overviewResult.status === 'fulfilled' ? overviewResult.value : EMPTY_OVERVIEW;
  const rewardsReport = rewardsResult.status === 'fulfilled' ? rewardsResult.value : EMPTY_REWARDS_REPORT;
  const ngoSummary = ngoResult.status === 'fulfilled' ? ngoResult.value : EMPTY_NGO_SUMMARY;
  const operationsReport = operationsResult.status === 'fulfilled' ? operationsResult.value : EMPTY_OPERATIONS_REPORT;
  const failedSources = [
    overviewResult.status === 'rejected' ? 'overview' : null,
    rewardsResult.status === 'rejected' ? 'rewards report' : null,
    ngoResult.status === 'rejected' ? 'NGO summary' : null,
    operationsResult.status === 'rejected' ? 'operations report' : null,
  ].filter(Boolean) as string[];
  const criticalReportFailures = [
    overviewResult.status === 'rejected' ? 'overview' : null,
    ngoResult.status === 'rejected' ? 'NGO summary' : null,
    operationsResult.status === 'rejected' ? 'operations report' : null,
  ].filter(Boolean) as string[];

  if (criticalReportFailures.length) {
    const blockerDetail = criticalReportFailures.length === 1
      ? `The ${criticalReportFailures[0]} feed failed to load from the live API. Leaving the reports route up would turn programme evidence, integrity checks, and delivery metrics into polished fiction.`
      : `The ${criticalReportFailures.join(', ')} feeds failed to load from the live API. Leaving the reports route up would turn programme evidence, integrity checks, and delivery metrics into polished fiction.`;

    return (
      <DeploymentBlockerCard
        title="Reports"
        subtitle="Reporting is an evidence surface, not a decorative dashboard. If the core feeds are down, the route should block instead of rendering fake calm."
        blockerHeadline="Deployment blocker: reports evidence feeds are degraded."
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length > criticalReportFailures.length
              ? `Additional degraded feed${failedSources.length - criticalReportFailures.length === 1 ? '' : 's'}: ${failedSources.filter((source) => !criticalReportFailures.includes(source)).join(', ')}.`
              : ''}
          </>
        )}
        whyBlocked={[
          'Programme totals, attendance, mastery, and operational integrity are deployment-review evidence. Zero-value fallback objects on those surfaces are actively misleading.',
          'Rewards detail can degrade separately, but if overview, NGO summary, or operations evidence disappears, this route should stop the rollout conversation immediately.',
        ]}
        verificationItems={[
          {
            surface: 'Programme snapshot',
            expected: 'Live learner, teacher, center, attendance, and mastery totals load from the real API',
            failure: 'All-zero cards or empty summary sections appear while core report feeds are down',
          },
          {
            surface: 'Delivery health + integrity readout',
            expected: 'Runtime completion, abandoned sessions, and integrity issue counts reflect live operational data',
            failure: 'Clean-looking fallback cards appear while the evidence feeds are degraded',
          },
          {
            surface: 'Route trustworthiness',
            expected: 'Deployment review sees a blocker card until the evidence feeds recover',
            failure: 'The route renders as if reporting is healthy when core evidence is missing',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Settings', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
          { label: 'Rewards', href: '/rewards', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
        ]}
      />
    );
  }

  return (
    <PageShell
      title="Reports"
      subtitle="Live evidence surface for delivery, rewards, and progression. No more pilot-era blocker card pretending reporting was unavailable when the feeds already existed."
      aside={(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/progress" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open progress
          </Link>
          <Link href="/rewards" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#ECFDF5', color: '#166534', textDecoration: 'none' }}>
            Open rewards
          </Link>
        </div>
      )}
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Reports is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Programme snapshot" eyebrow="Overview report">
          <MetricList items={[
            { label: 'Learners', value: String(overview.totalStudents) },
            { label: 'Teachers', value: String(overview.totalTeachers) },
            { label: 'Centers', value: String(overview.totalCenters) },
            { label: 'Assignments', value: String(overview.totalAssignments) },
          ]} />
        </Card>
        <Card title="Readiness snapshot" eyebrow="Progression mix">
          <MetricList items={[
            { label: 'Ready', value: String(overview.readinessCount || ngoSummary.progression.ready) },
            { label: 'Watch', value: String(overview.watchCount || ngoSummary.progression.watch) },
            { label: 'On track', value: String(overview.onTrackCount || ngoSummary.progression.onTrack) },
            { label: 'Avg mastery', value: percent(overview.averageMastery || ngoSummary.totals.averageMastery) },
          ]} />
        </Card>
        <Card title="Reward operations" eyebrow="Queue + throughput">
          <MetricList items={[
            { label: 'XP awarded', value: String(rewardsReport.summary.totalXpAwarded || ngoSummary.totals.totalXpAwarded) },
            { label: 'Requests', value: String(rewardsReport.summary.requestCount) },
            { label: 'Fulfillment rate', value: percent(rewardsReport.summary.fulfillmentRate || operationsReport.summary.rewardFulfillmentRate) },
            { label: 'Pending queue', value: String(operationsReport.summary.rewardPendingRequests) },
          ]} />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Subject breakdown" eyebrow="What learners are actually moving through">
          <SimpleTable
            columns={['Subject', 'Learners', 'Lessons completed', 'Average mastery']}
            rows={ngoSummary.subjectBreakdown.length ? ngoSummary.subjectBreakdown.map((item) => [
              item.subjectName,
              String(item.learnerCount),
              String(item.lessonsCompleted),
              percent(item.averageMastery),
            ]) : emptyRows('Subject breakdown is unavailable right now.')}
          />
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card title="Delivery health" eyebrow="Operational risk readout">
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Attendance + runtime</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                  {percent(overview.averageAttendance || ngoSummary.totals.attendanceAverage)} attendance average · {percent(operationsReport.summary.runtimeCompletionRate)} runtime completion · {operationsReport.summary.runtimeAbandonedSessions} abandoned sessions.
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 16, background: operationsReport.summary.integrityIssueCount ? '#FEF2F2' : '#ECFDF5', border: `1px solid ${operationsReport.summary.integrityIssueCount ? '#FECACA' : '#BBF7D0'}` }}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: operationsReport.summary.integrityIssueCount ? '#991B1B' : '#166534' }}>
                  {operationsReport.summary.integrityIssueCount ? `${operationsReport.summary.integrityIssueCount} integrity issue${operationsReport.summary.integrityIssueCount === 1 ? '' : 's'} visible` : 'Integrity checks look clean'}
                </div>
                <div style={{ color: operationsReport.summary.integrityIssueCount ? '#991B1B' : '#166534', lineHeight: 1.6 }}>
                  {operationsReport.summary.integrityIssueCount ? 'Settings still needs cleanup attention before anyone calls this reporting stack pristine.' : 'Good. The evidence layer is not screaming at you today.'}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Top learners" eyebrow="Reward + mastery overlap">
            <div style={{ display: 'grid', gap: 10 }}>
              {ngoSummary.topLearners.length ? ngoSummary.topLearners.slice(0, 5).map((learner) => (
                <div key={learner.learnerId} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{learner.learnerName ?? learner.learnerId}</strong>
                    <div style={{ color: '#64748b', marginTop: 4 }}>Level {learner.level} · {learner.badgesUnlocked} badges</div>
                  </div>
                  <Pill label={`${learner.totalXp} XP`} tone="#EEF2FF" text="#3730A3" />
                </div>
              )) : <div style={{ color: '#64748b' }}>No top learner snapshot returned.</div>}
            </div>
          </Card>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Reward demand" eyebrow="What learners keep asking for">
          <SimpleTable
            columns={['Reward item', 'Requests', 'Fulfilled', 'Pending']}
            rows={rewardsReport.rewardDemand.length ? rewardsReport.rewardDemand.map((item) => [
              item.rewardTitle,
              String(item.requests),
              String(item.fulfilled),
              String(item.pending),
            ]) : emptyRows('Reward demand report is unavailable right now.')}
          />
        </Card>

        <Card title="Recent operational evidence" eyebrow="Hotlist + recent issues">
          <SimpleTable
            columns={['Signal', 'Count', 'Preview', 'Why it matters']}
            rows={[
              ['Watch learners', String(operationsReport.hotlist.watchLearners.length), operationsReport.hotlist.watchLearners[0]?.studentName ?? '—', 'These learners need progression attention first.'],
              ['Ready learners', String(operationsReport.hotlist.readyLearners.length), operationsReport.hotlist.readyLearners[0]?.studentName ?? '—', 'Use this to plan the next release-ready moves.'],
              ['Reward queue', String(operationsReport.hotlist.rewardQueue.length), jsonCell(operationsReport.hotlist.rewardQueue[0]), 'Backlog here becomes operator debt fast.'],
              ['Integrity issues', String(operationsReport.recent.integrityIssues.length), operationsReport.recent.integrityIssues[0]?.type ?? '—', 'If this is non-zero, your reports need a footnote, not swagger.'],
            ]}
          />
        </Card>
      </section>
    </PageShell>
  );
}
