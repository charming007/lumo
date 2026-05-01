import { ExportShareCard } from '../../components/export-share-card';
import { fetchCohorts, fetchMallams, fetchNgoSummary, fetchOperationsReport, fetchPods, fetchReportsOverview, fetchRewardsReport } from '../../lib/api';
import type { NgoSummary, OperationsReport, ReportsOverview, RewardsReport } from '../../lib/types';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

function normalizeFilterValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

const emptyOverview: ReportsOverview = {
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

const emptyNgoSummary: NgoSummary = {
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

const emptyOperations: OperationsReport = {
  scope: {},
  summary: {
    learnersInScope: 0,
    runtimeCompletionRate: 0,
    runtimeAbandonedSessions: 0,
    progressionReady: 0,
    progressionWatch: 0,
    rewardPendingRequests: 0,
    rewardFulfillmentRate: 0,
    rewardBacklogUrgent: 0,
    activeProgressionOverrides: 0,
    sessionRepairs: 0,
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
    stalledRuntimeLearners: [],
    highSupportLearners: [],
    rewardQueue: [],
  },
  recent: {
    sessions: [],
    events: [],
    overrides: [],
    rewardAdjustments: [],
    rewardRequests: [],
    integrityIssues: [],
  },
};

const emptyRewards: RewardsReport = {
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

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ cohort?: string | string[]; pod?: string | string[]; mallam?: string | string[] }> }) {
  const query = await searchParams;
  const cohortFilter = normalizeFilterValue(query?.cohort).trim();
  const podFilter = normalizeFilterValue(query?.pod).trim();
  const mallamFilter = normalizeFilterValue(query?.mallam).trim();

  const [overviewResult, ngoSummaryResult, operationsResult, rewardsResult, cohortsResult, podsResult, mallamsResult] = await Promise.allSettled([
    fetchReportsOverview(),
    fetchNgoSummary(),
    fetchOperationsReport(8, { cohortId: cohortFilter || undefined, podId: podFilter || undefined, mallamId: mallamFilter || undefined }),
    fetchRewardsReport(8, { cohortId: cohortFilter || undefined, podId: podFilter || undefined, mallamId: mallamFilter || undefined }),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
  ]);

  const overview = overviewResult.status === 'fulfilled' ? overviewResult.value : emptyOverview;
  const ngoSummary = ngoSummaryResult.status === 'fulfilled' ? ngoSummaryResult.value : emptyNgoSummary;
  const operations = operationsResult.status === 'fulfilled' ? operationsResult.value : emptyOperations;
  const rewards = rewardsResult.status === 'fulfilled' ? rewardsResult.value : emptyRewards;
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];

  const failedSources = [
    overviewResult.status === 'rejected' ? 'overview' : null,
    ngoSummaryResult.status === 'rejected' ? 'NGO summary' : null,
    operationsResult.status === 'rejected' ? 'operations report' : null,
    rewardsResult.status === 'rejected' ? 'rewards report' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
  ].filter(Boolean) as string[];

  const hotlistRows = [...(operations.hotlist.readyLearners || []), ...(operations.hotlist.watchLearners || [])];

  return (
    <PageShell
      title="Reports"
      subtitle="Review NGO, operations, and reward intelligence without bouncing back into Progress."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Reporting summary" eyebrow="Live API">
          <MetricList
            items={[
              { label: 'Learners', value: String(overview.totalStudents) },
              { label: 'Assignments', value: String(overview.totalAssignments) },
              { label: 'Ready learners', value: String(operations.summary.progressionReady) },
              { label: 'Reward XP', value: String(rewards.summary.totalXpAwarded) },
            ]}
          />
        </Card>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          Reports recovered with degraded feeds: {failedSources.join(', ')}. Operators can still filter, export, and review any live sections instead of getting punted into a 500 when one report feed flakes out.
        </div>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <Card title="Report filters" eyebrow="Operator scope">
          <form style={{ ...responsiveGrid(220), gap: 12 }}>
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
            <button type="submit" style={{ borderRadius: 12, border: 0, background: '#3730A3', color: 'white', fontWeight: 800, padding: '12px 16px' }}>Apply filters</button>
          </form>
        </Card>
      </section>

      <section style={{ ...responsiveGrid(280), marginBottom: 20 }}>
        <Card title="Program health" eyebrow="Overview">
          <MetricList
            items={[
              { label: 'Attendance average', value: `${Math.round(overview.averageAttendance)}%` },
              { label: 'Mastery average', value: `${Math.round(overview.averageMastery)}%` },
              { label: 'Readiness count', value: String(overview.readinessCount) },
              { label: 'Watch count', value: String(overview.watchCount) },
            ]}
          />
        </Card>

        <Card title="NGO snapshot" eyebrow="Live API">
          <MetricList
            items={[
              { label: 'Centers', value: String(ngoSummary.totals.centers) },
              { label: 'Pods', value: String(ngoSummary.totals.pods) },
              { label: 'Mallams', value: String(ngoSummary.totals.mallams) },
              { label: 'Lessons completed', value: String(ngoSummary.totals.lessonsCompleted) },
            ]}
          />
        </Card>
      </section>

      <Card title="Subject breakdown" eyebrow="NGO summary">
        <SimpleTable
          columns={['Subject', 'Learners', 'Lessons completed', 'Mastery']}
          rows={ngoSummary.subjectBreakdown.map((row) => [
            row.subjectName,
            String(row.learnerCount),
            String(row.lessonsCompleted),
            `${Math.round(row.averageMastery)}%`,
          ])}
        />
      </Card>

      <div style={{ height: 20 }} />

      <ExportShareCard
        title="Export and share report summary"
        eyebrow="Ops handoff"
        summary="Export the current filtered reporting snapshot or copy a handoff summary for leadership, NGO partners, or field ops."
        shareTitle="Lumo report summary"
        shareText={`Lumo reports summary\nLearners: ${overview.totalStudents}\nAssignments: ${overview.totalAssignments}\nReady learners: ${operations.summary.progressionReady}\nReward XP: ${rewards.summary.totalXpAwarded}`}
        artifacts={[
          {
            label: 'Download summary.json',
            filename: 'lumo-report-summary.json',
            mimeType: 'application/json',
            content: JSON.stringify({ overview, ngoSummary, operationsSummary: operations.summary, rewardsSummary: rewards.summary }, null, 2),
            tone: '#EEF2FF',
            text: '#3730A3',
          },
          {
            label: 'Download hotlist.csv',
            filename: 'lumo-hotlist.csv',
            mimeType: 'text/csv',
            content: ['Learner,Cohort,Pod,Status,XP,Badges', ...hotlistRows.map((item) => [item.studentName, item.cohortName || '', item.podLabel || '', item.progressionStatus, item.totalXp || 0, item.badgesUnlocked || 0].join(','))].join('\n'),
            tone: '#ECFDF5',
            text: '#166534',
          },
        ]}
      />

      <div style={{ height: 20 }} />

      <Card title="Operational hotlist" eyebrow="Operations report">
        <SimpleTable
          columns={['Learner', 'Cohort', 'Pod', 'Status', 'XP', 'Badges']}
          rows={hotlistRows.map((item) => [
            item.studentName,
            item.cohortName || '—',
            item.podLabel || '—',
            <Pill key={`${item.id}-status`} label={item.progressionStatus} tone="#F8FAFC" text="#334155" />,
            String(item.totalXp || 0),
            String(item.badgesUnlocked || 0),
          ])}
        />
      </Card>
    </PageShell>
  );
}
