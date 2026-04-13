import Link from 'next/link';
import type { ReactNode } from 'react';
import type { DashboardInsight, NgoSummary, OperationsReport, ReportsOverview } from '../../lib/types';
import { fetchAssignments, fetchCohorts, fetchDashboardInsights, fetchMallams, fetchNgoSummary, fetchOperationsReport, fetchPods, fetchProgress, fetchReportsOverview, fetchStudents } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

const EMPTY_REPORT: ReportsOverview = {
  totalStudents: 0,
  totalTeachers: 0,
  totalCenters: 0,
  activePods: 0,
  totalAssignments: 0,
  assignmentsDueThisWeek: 0,
  presentToday: 0,
  averageAttendance: 0,
  podsNeedingAttention: 0,
  averageMastery: 0,
  readinessCount: 0,
  onTrackCount: 0,
  watchCount: 0,
};

const FALLBACK_INSIGHT: DashboardInsight = {
  priority: 'Reporting feed offline',
  headline: 'Executive reporting is temporarily unavailable',
  detail: 'The reports route still loads so operators can confirm the LMS is up, but live narrative data needs the API connection to recover.',
  metric: 'API retry needed',
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
  rewardOps: {
    summary: {
      pending: 0,
      approved: 0,
      fulfilled: 0,
      urgentCount: 0,
      attentionCount: 0,
    },
    recentQueue: [],
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

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safeRows(message: string, columns: number): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, ...Array.from({ length: columns - 1 }, () => '')]];
}

function statusTone(status: string) {
  if (status === 'ready') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'watch') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function normalizeFilterValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  return values.filter(Boolean).join(' ').toLowerCase().includes(query);
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

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<{ q?: string | string[]; cohort?: string | string[]; pod?: string | string[]; mallam?: string | string[] }> }) {
  const params = await searchParams;
  const searchText = normalizeFilterValue(params?.q).trim().toLowerCase();
  const cohortFilter = normalizeFilterValue(params?.cohort).trim();
  const podFilter = normalizeFilterValue(params?.pod).trim();
  const mallamFilter = normalizeFilterValue(params?.mallam).trim();

  const [reportResult, insightsResult, studentsResult, mallamsResult, podsResult, assignmentsResult, progressResult, operationsResult, cohortsResult, ngoSummaryResult] = await Promise.allSettled([
    fetchReportsOverview(),
    fetchDashboardInsights(),
    fetchStudents(),
    fetchMallams(),
    fetchPods(),
    fetchAssignments(),
    fetchProgress(),
    fetchOperationsReport(12, {
      cohortId: cohortFilter || undefined,
      podId: podFilter || undefined,
      mallamId: mallamFilter || undefined,
    }),
    fetchCohorts(),
    fetchNgoSummary({
      cohortId: cohortFilter || undefined,
      podId: podFilter || undefined,
      mallamId: mallamFilter || undefined,
    }),
  ]);

  const report = reportResult.status === 'fulfilled' ? reportResult.value : EMPTY_REPORT;
  const insights = insightsResult.status === 'fulfilled' ? insightsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  const progress = progressResult.status === 'fulfilled' ? progressResult.value : [];
  const operationsReport = operationsResult.status === 'fulfilled' ? operationsResult.value : EMPTY_OPERATIONS_REPORT;
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const ngoSummary = ngoSummaryResult.status === 'fulfilled' ? ngoSummaryResult.value : EMPTY_NGO_SUMMARY;

  const failedSources = [
    reportResult.status === 'rejected' ? 'report metrics' : null,
    insightsResult.status === 'rejected' ? 'executive narrative' : null,
    studentsResult.status === 'rejected' ? 'learners' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    assignmentsResult.status === 'rejected' ? 'assignments' : null,
    progressResult.status === 'rejected' ? 'progress' : null,
    operationsResult.status === 'rejected' ? 'operations report' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    ngoSummaryResult.status === 'rejected' ? 'ngo summary' : null,
  ].filter(Boolean);

  const scopedStudents = students.filter((student) => {
    const cohortMatches = !cohortFilter || student.cohortId === cohortFilter;
    const podMatches = !podFilter || student.podId === podFilter;
    const mallamMatches = !mallamFilter || student.mallamId === mallamFilter;
    const queryMatches = matchesQuery([student.name, student.cohortName, student.podLabel, student.mallamName], searchText);
    return cohortMatches && podMatches && mallamMatches && queryMatches;
  });

  const podSnapshots = pods
    .map((pod) => {
      const podStudents = scopedStudents.filter((student) => student.podId === pod.id);
      const podProgress = progress.filter((item) => podStudents.some((student) => student.id === item.studentId));
      const podAssignments = assignments.filter((assignment) => assignment.podLabel === pod.label);
      const watchCount = podProgress.filter((item) => item.progressionStatus === 'watch').length;
      const readyCount = podProgress.filter((item) => item.progressionStatus === 'ready').length;
      const attendanceAverage = average(podStudents.map((student) => student.attendanceRate));
      const masteryAverage = average(podProgress.map((item) => item.mastery));
      return {
        ...pod,
        rosterCount: podStudents.length,
        assignmentCount: podAssignments.length,
        watchCount,
        readyCount,
        attendanceAverage,
        masteryAverage,
      };
    })
    .filter((pod) => pod.rosterCount > 0 || (!cohortFilter && !podFilter && !mallamFilter && !searchText));

  const mallamSnapshots = mallams
    .map((mallam) => {
      const roster = scopedStudents.filter((student) => student.mallamId === mallam.id);
      const rosterProgress = progress.filter((item) => roster.some((student) => student.id === item.studentId));
      const readinessCount = rosterProgress.filter((item) => item.progressionStatus === 'ready').length;
      const watchCount = rosterProgress.filter((item) => item.progressionStatus === 'watch').length;
      return {
        ...mallam,
        rosterCount: roster.length,
        attendanceAverage: average(roster.map((student) => student.attendanceRate)),
        masteryAverage: average(rosterProgress.map((item) => item.mastery)),
        readinessCount,
        watchCount,
      };
    })
    .filter((mallam) => mallam.rosterCount > 0 || (!cohortFilter && !podFilter && !mallamFilter && !searchText));

  const highestRiskPods = [...podSnapshots]
    .sort((a, b) => (b.watchCount - a.watchCount) || (a.attendanceAverage - b.attendanceAverage))
    .slice(0, 5);

  const highestImpactMallams = [...mallamSnapshots]
    .sort((a, b) => (b.readinessCount - a.readinessCount) || (b.rosterCount - a.rosterCount))
    .slice(0, 5);

  const donorCoverage = ngoSummary.totals.learners > 0 && ngoSummary.totals.centers > 0
    ? `${ngoSummary.totals.learners} learners across ${ngoSummary.totals.centers} center${ngoSummary.totals.centers === 1 ? '' : 's'}`
    : report.totalStudents > 0 && report.totalCenters > 0
      ? `${scopedStudents.length || report.totalStudents} learners across ${report.totalCenters} center${report.totalCenters === 1 ? '' : 's'}`
      : 'Coverage feed unavailable';
  const learnerRetentionSignal = ngoSummary.totals.learners
    ? `${Math.round(ngoSummary.totals.attendanceAverage * 100)}% average attendance suggests ${ngoSummary.totals.attendanceAverage >= 0.9 ? 'strong' : ngoSummary.totals.attendanceAverage >= 0.85 ? 'stable' : 'fragile'} retention`
    : scopedStudents.length
      ? `${Math.round(average(scopedStudents.map((student) => student.attendanceRate)) * 100)}% average attendance suggests ${average(scopedStudents.map((student) => student.attendanceRate)) >= 0.9 ? 'strong' : average(scopedStudents.map((student) => student.attendanceRate)) >= 0.85 ? 'stable' : 'fragile'} retention`
      : 'Retention signal unavailable';
  const readinessSignal = ngoSummary.totals.learners
    ? `${ngoSummary.progression.ready} learners are ready to progress with ${ngoSummary.progression.watch} still on watch`
    : operationsReport.summary.progressionReady > 0
      ? `${operationsReport.summary.progressionReady} learners are ready to progress with ${operationsReport.summary.progressionWatch} still on watch`
      : 'No progression-ready learners visible yet';
  const staffingSignal = mallamSnapshots.length
    ? `${mallamSnapshots.filter((mallam) => mallam.watchCount > 0).length} mallams are carrying watchlist load`
    : 'Staffing signal unavailable';

  const donorNarratives = [
    { title: 'Coverage and reach', detail: donorCoverage, tone: '#EEF2FF', text: '#3730A3' },
    { title: 'Attendance retention signal', detail: learnerRetentionSignal, tone: '#ECFDF5', text: '#166534' },
    { title: 'Progression readiness signal', detail: readinessSignal, tone: '#FFF7ED', text: '#9A3412' },
    { title: 'Facilitator pressure signal', detail: staffingSignal, tone: '#F8FAFC', text: '#334155' },
  ];

  const complianceRows = [
    ['Learner attendance logged', `${report.presentToday}/${report.totalStudents || 0} present today`, report.totalStudents ? `${Math.round((report.presentToday / report.totalStudents) * 100)}% capture` : 'No capture'],
    ['Assignments tracked', `${ngoSummary.totals.activeAssignments || report.totalAssignments} live`, `${report.assignmentsDueThisWeek} due this week`],
    ['Pods under watch', `${report.podsNeedingAttention} flagged`, `${podSnapshots.filter((item) => item.attendanceAverage < 0.85).length} below 85% attendance`],
    ['Promotion evidence', `${ngoSummary.progression.ready || operationsReport.summary.progressionReady} ready`, `${ngoSummary.progression.watch || operationsReport.summary.progressionWatch} watchlist`],
  ];

  const recentRewardRequests = (operationsReport.recent.rewardRequests ?? []).slice(0, 6);
  const recentIntegrityIssues = operationsReport.recent.integrityIssues.slice(0, 6);
  const highSupportLearners = (operationsReport.hotlist.highSupportLearners ?? []).slice(0, 6);
  const filtersActive = Boolean(searchText || cohortFilter || podFilter || mallamFilter);
  const selectedCohort = cohorts.find((cohort) => cohort.id === cohortFilter) ?? null;
  const selectedPod = pods.find((pod) => pod.id === podFilter) ?? null;
  const selectedMallam = mallams.find((mallam) => mallam.id === mallamFilter) ?? null;
  const scopeLabel = buildScopeLabel({ cohortName: selectedCohort?.name, podLabel: selectedPod?.label, mallamName: selectedMallam?.displayName });
  const scopedReportNarratives = [
    `Scope: ${scopeLabel}. ${scopedStudents.length || ngoSummary.scope.learnerCount || report.totalStudents} learner${(scopedStudents.length || ngoSummary.scope.learnerCount || report.totalStudents) === 1 ? '' : 's'} are represented in this pull.`,
    `${ngoSummary.progression.ready || operationsReport.summary.progressionReady} learner${(ngoSummary.progression.ready || operationsReport.summary.progressionReady) === 1 ? '' : 's'} are ready to progress, while ${ngoSummary.progression.watch || operationsReport.summary.progressionWatch} remain on watch.`,
    `Attendance sits around ${Math.round((ngoSummary.totals.attendanceAverage || (scopedStudents.length ? average(scopedStudents.map((student) => student.attendanceRate)) : report.averageAttendance)) * 100)}% and reward backlog pressure is ${operationsReport.summary.rewardBacklogUrgent ?? ngoSummary.rewardOps?.summary?.urgentCount ?? 0} urgent item${(operationsReport.summary.rewardBacklogUrgent ?? ngoSummary.rewardOps?.summary?.urgentCount ?? 0) === 1 ? '' : 's'}.`,
  ];
  const narrativePack = [
    {
      title: 'Operator call summary',
      detail: `${scopeLabel}: ${scopedStudents.length || ngoSummary.scope.learnerCount || report.totalStudents} learner${(scopedStudents.length || ngoSummary.scope.learnerCount || report.totalStudents) === 1 ? '' : 's'} in scope, ${ngoSummary.progression.watch || operationsReport.summary.progressionWatch} on watch, and reward backlog pressure sitting at ${operationsReport.summary.rewardBacklogUrgent ?? ngoSummary.rewardOps?.summary?.urgentCount ?? 0} urgent item${(operationsReport.summary.rewardBacklogUrgent ?? ngoSummary.rewardOps?.summary?.urgentCount ?? 0) === 1 ? '' : 's'}.`,
      tone: '#EEF2FF',
      text: '#3730A3',
    },
    {
      title: 'NGO / donor update',
      detail: `${donorCoverage}. Attendance is ${Math.round((ngoSummary.totals.attendanceAverage || (scopedStudents.length ? average(scopedStudents.map((student) => student.attendanceRate)) : report.averageAttendance)) * 100)}% on average, ${ngoSummary.progression.ready || operationsReport.summary.progressionReady} learner${(ngoSummary.progression.ready || operationsReport.summary.progressionReady) === 1 ? '' : 's'} are progression-ready, and facilitator pressure is visible across ${mallamSnapshots.filter((mallam) => mallam.watchCount > 0).length} mallam${mallamSnapshots.filter((mallam) => mallam.watchCount > 0).length === 1 ? '' : 's'}.`,
      tone: '#ECFDF5',
      text: '#166534',
    },
    {
      title: 'Government / compliance readout',
      detail: `${report.presentToday}/${report.totalStudents || 0} learners are marked present today, ${ngoSummary.totals.activeAssignments || report.totalAssignments} assignment${(ngoSummary.totals.activeAssignments || report.totalAssignments) === 1 ? '' : 's'} remain visible in the operating picture, and ${report.podsNeedingAttention} pod${report.podsNeedingAttention === 1 ? '' : 's'} still need intervention first.`,
      tone: '#FFF7ED',
      text: '#9A3412',
    },
  ];

  return (
    <PageShell title="Reports" subtitle="Program, donor, and government-ready analytics with operational depth: pod health, mallam contribution, assignment pressure, progression reality, reward queue pressure, and cleaner NGO reporting in one place.">
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Reports is running in degraded mode: {failedSources.join(' + ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <Card title="Reporting filters" eyebrow="Scope the story before you share it">
          <form style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...responsiveGrid(220), gap: 12 }}>
              <input name="q" defaultValue={searchText} placeholder="Search learner, pod, mallam, or narrative signal" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
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
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}>Apply filters</button>
              <a href="/reports" style={{ borderRadius: 12, padding: '12px 16px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>Clear filters</a>
            </div>
          </form>
        </Card>
      </section>

      {filtersActive ? (
        <div style={{ marginBottom: 16, color: '#475569', fontWeight: 700 }}>
          Reporting scope now reflects {scopedStudents.length} learner{scopedStudents.length === 1 ? '' : 's'} with live ops pull-through on pods, mallams, and reward pressure.
        </div>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Scope summary" eyebrow="What this report is actually describing">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 18, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730A3', fontWeight: 800 }}>
              {scopeLabel}
            </div>
            <div style={{ color: '#64748b', lineHeight: 1.7 }}>
              {searchText ? `Search filter: “${searchText}”. ` : ''}
              This scope keeps the narrative tied to the actual cohort, pod, or mallam slice instead of forcing operators to mentally subtract noise.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {selectedMallam ? (
                <Link href={`/mallams/${selectedMallam.id}`} style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
                  Open mallam detail
                </Link>
              ) : null}
              {selectedPod ? (
                <Link href={`/assignments?pod=${selectedPod.id}`} style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
                  Review pod assignments
                </Link>
              ) : null}
              {selectedCohort ? (
                <Link href={`/assignments?cohort=${selectedCohort.id}`} style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
                  Review cohort assignments
                </Link>
              ) : null}
            </div>
          </div>
        </Card>

        <Card title="Share-ready narrative" eyebrow="Copy into an update without rewriting it all">
          <div style={{ display: 'grid', gap: 10 }}>
            {scopedReportNarratives.map((item, index) => (
              <div key={index} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7', color: '#475569', lineHeight: 1.7 }}>
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Program overview" eyebrow="Coverage">
          <MetricList items={[
            { label: 'Total learners', value: String(ngoSummary.totals.learners || scopedStudents.length || report.totalStudents) },
            { label: 'Mallams and facilitators', value: String(ngoSummary.totals.mallams || report.totalTeachers) },
            { label: 'Centers live', value: String(ngoSummary.totals.centers || report.totalCenters) },
            { label: 'Active pods', value: String(ngoSummary.totals.pods || podSnapshots.length || report.activePods) },
          ]} />
        </Card>
        <Card title="Delivery metrics" eyebrow="Execution">
          <MetricList items={[
            { label: 'Assignments tracked', value: String(ngoSummary.totals.activeAssignments || report.totalAssignments) },
            { label: 'Assignments due this week', value: String(report.assignmentsDueThisWeek) },
            { label: 'Present today', value: String(report.presentToday) },
            { label: 'Pods needing attention', value: String(report.podsNeedingAttention) },
          ]} />
        </Card>
        <Card title="Learning metrics" eyebrow="Outcomes">
          <MetricList items={[
            { label: 'Average attendance', value: `${Math.round((ngoSummary.totals.attendanceAverage || (scopedStudents.length ? average(scopedStudents.map((student) => student.attendanceRate)) : report.averageAttendance)) * 100)}%` },
            { label: 'Average mastery', value: `${Math.round((ngoSummary.totals.averageMastery || (podSnapshots.length ? average(podSnapshots.map((pod) => pod.masteryAverage)) : report.averageMastery)) * 100)}%` },
            { label: 'Ready to progress', value: String(ngoSummary.progression.ready || operationsReport.summary.progressionReady) },
            { label: 'Watchlist learners', value: String(ngoSummary.progression.watch || operationsReport.summary.progressionWatch) },
          ]} />
        </Card>
        <Card title="Operations pulse" eyebrow="Runtime + reward pressure">
          <MetricList items={[
            { label: 'Completion rate', value: `${Math.round(operationsReport.summary.runtimeCompletionRate * 100)}%` },
            { label: 'Abandoned sessions', value: String(operationsReport.summary.runtimeAbandonedSessions) },
            { label: 'Pending reward requests', value: String(operationsReport.summary.rewardPendingRequests) },
            { label: 'Urgent reward backlog', value: String(operationsReport.summary.rewardBacklogUrgent ?? ngoSummary.rewardOps?.summary?.urgentCount ?? 0) },
          ]} />
        </Card>
      </section>


      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Narrative pack" eyebrow="Pasteable summaries for real stakeholders">
          <div style={{ display: 'grid', gap: 12 }}>
            {narrativePack.map((item) => (
              <div key={item.title} style={{ padding: 16, borderRadius: 18, background: item.tone, color: item.text, border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{item.title}</div>
                <div style={{ lineHeight: 1.7 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Reporting handoff" eyebrow="Move from analytics to action">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Scope before story', 'Filter by cohort, pod, or mallam first. A noisy all-system report is worse than useless when someone needs a decision.'],
              ['Narrative should match the evidence', 'If the copy-ready update says things are stable while the hotlist and reward backlog are on fire, the narrative is lying.'],
              ['Use route handoffs on purpose', 'Jump from reports into mallam detail, assignments, or the LMS guide instead of making operators reconstruct the path from memory.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#F8FAFC', border: '1px solid #EEF2F7' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/guide#reports" style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
                Reporting guide →
              </Link>
              <Link href="/guide#system-flow" style={{ color: '#7C3AED', fontWeight: 800, textDecoration: 'none' }}>
                End-to-end LMS flow →
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Executive narrative" eyebrow="What changed">
          <div style={{ display: 'grid', gap: 14 }}>
            {(insights.length ? insights : [FALLBACK_INSIGHT]).map((item) => (
              <div key={item.priority} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: 18, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{item.priority}</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{item.headline}</div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>{item.detail}</div>
                </div>
                <div>
                  <Pill label={item.metric} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Operator readout" eyebrow="Use this before a review call">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Attendance is the earliest smoke alarm', 'If pod attendance drops before mastery drops, the delivery setup is probably slipping before the curriculum does.'],
              ['Readiness should concentrate, not vanish', 'If no mallam has ready learners, either the bar is broken or the content ladder is clogged upstream.'],
              ['Reward pressure is now part of the story', 'Donor reporting that ignores pending or urgent reward debt is just a prettier lie. Queue health belongs in the operating picture.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="NGO / donor summary" eyebrow="Shareable without rewriting the whole story">
          <div style={{ display: 'grid', gap: 12 }}>
            {donorNarratives.map((item) => (
              <div key={item.title} style={{ padding: 16, borderRadius: 18, background: item.tone, color: item.text, border: '1px solid rgba(148, 163, 184, 0.18)' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{item.title}</div>
                <div style={{ lineHeight: 1.6 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Reporting compliance board" eyebrow="What a grant or ministry review will ask first">
          <SimpleTable columns={['Check', 'Current state', 'Signal']} rows={complianceRows} />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16, marginBottom: 20 }}>
        <Card title="Operations hotlist" eyebrow="Cross-system reality check">
          <SimpleTable
            columns={['Learner', 'Mallam', 'Pod', 'Status', 'XP']}
            rows={operationsReport.hotlist.watchLearners.length ? operationsReport.hotlist.watchLearners.map((entry) => {
              const tone = statusTone(entry.progressionStatus);
              return [
                entry.studentName,
                entry.mallamName ?? '—',
                entry.podLabel ?? '—',
                <Pill key={entry.id} label={entry.progressionStatus} tone={tone.tone} text={tone.text} />,
                `${entry.totalXp} XP`,
              ];
            }) : safeRows('Operations hotlist is unavailable right now.', 5)}
          />
        </Card>

        <Card title="Recent reward requests" eyebrow="Queue pressure with timestamps">
          <SimpleTable
            columns={['When', 'Learner', 'Reward', 'Status']}
            rows={recentRewardRequests.length ? recentRewardRequests.map((entry, index) => {
              const record = asRecord(entry) ?? {};
              const status = typeof record.status === 'string' ? record.status : 'pending';
              const tone = status === 'fulfilled' ? { tone: '#DCFCE7', text: '#166534' } : status === 'approved' ? { tone: '#DBEAFE', text: '#1D4ED8' } : { tone: '#FEF3C7', text: '#92400E' };
              return [
                formatDate(record.updatedAt ?? record.createdAt),
                typeof record.learnerName === 'string' ? record.learnerName : typeof record.studentId === 'string' ? record.studentId : '—',
                typeof record.rewardTitle === 'string' ? record.rewardTitle : 'Reward request',
                <Pill key={`request-${index}`} label={status} tone={tone.tone} text={tone.text} />,
              ];
            }) : safeRows('Reward request activity is unavailable right now.', 4)}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Pod health matrix" eyebrow="Where delivery is smooth vs noisy">
          <SimpleTable
            columns={['Pod', 'Center', 'Learners', 'Attendance', 'Mastery', 'Ready', 'Watch', 'Assignments']}
            rows={podSnapshots.length ? podSnapshots.map((pod) => [
              pod.label,
              pod.centerName,
              String(pod.rosterCount),
              `${Math.round(pod.attendanceAverage * 100)}%`,
              `${Math.round(pod.masteryAverage * 100)}%`,
              String(pod.readyCount),
              String(pod.watchCount),
              String(pod.assignmentCount),
            ]) : safeRows('Pod analytics are unavailable right now.', 8)}
          />
        </Card>

        <Card title="Mallam contribution board" eyebrow="Who is moving learners forward">
          <SimpleTable
            columns={['Mallam', 'Center', 'Roster', 'Attendance', 'Mastery', 'Ready', 'Watch', 'Status']}
            rows={mallamSnapshots.length ? mallamSnapshots.map((mallam) => {
              const tone = mallam.status === 'active' ? { tone: '#DCFCE7', text: '#166534' } : mallam.status === 'training' ? { tone: '#FEF3C7', text: '#92400E' } : { tone: '#E0E7FF', text: '#3730A3' };
              return [
                <div key={`${mallam.id}-name`} style={{ display: 'grid', gap: 6 }}>
                  <strong>{mallam.displayName}</strong>
                  <Link href={`/mallams/${mallam.id}`} style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>Open detail →</Link>
                </div>,
                mallam.centerName ?? mallam.region,
                String(mallam.rosterCount),
                `${Math.round(mallam.attendanceAverage * 100)}%`,
                `${Math.round(mallam.masteryAverage * 100)}%`,
                String(mallam.readinessCount),
                String(mallam.watchCount),
                <Pill key={mallam.id} label={mallam.status} tone={tone.tone} text={tone.text} />,
              ];
            }) : safeRows('Mallam analytics are unavailable right now.', 8)}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="High-support runtime learners" eyebrow="Where facilitation effort is clustering">
          <SimpleTable
            columns={['Learner', 'Sessions', 'Completed', 'Support actions']}
            rows={highSupportLearners.length ? highSupportLearners.map((entry, index) => {
              const record = asRecord(entry) ?? {};
              return [
                typeof record.learnerName === 'string' ? record.learnerName : typeof record.studentName === 'string' ? record.studentName : `Learner ${index + 1}`,
                String(record.sessions ?? 0),
                String(record.completedSessions ?? 0),
                String(record.totalSupportActions ?? 0),
              ];
            }) : safeRows('Runtime support analytics are unavailable right now.', 4)}
          />
        </Card>

        <Card title="Integrity watchlist" eyebrow="Data issues still worth fixing">
          <SimpleTable
            columns={['Type', 'Entity', 'Identifier']}
            rows={recentIntegrityIssues.length ? recentIntegrityIssues.map((issue) => [
              issue.type,
              issue.entity ?? '—',
              issue.id,
            ]) : safeRows('No integrity issues are visible right now.', 3)}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Subject mastery board" eyebrow="What donor summaries usually flatten away">
          <SimpleTable
            columns={['Subject', 'Learners', 'Average mastery', 'Lessons completed']}
            rows={ngoSummary.subjectBreakdown.length ? ngoSummary.subjectBreakdown.map((subject) => [
              subject.subjectName,
              String(subject.learnerCount),
              `${Math.round(subject.averageMastery * 100)}%`,
              String(subject.lessonsCompleted),
            ]) : safeRows('Subject-level NGO reporting is unavailable right now.', 4)}
          />
        </Card>

        <Card title="Admin controls pressure" eyebrow="Manual intervention that should stay visible">
          <SimpleTable
            columns={['Signal', 'Count', 'Why it matters']}
            rows={[
              ['Progression overrides', String(operationsReport.summary.activeProgressionOverrides ?? 0), 'If this climbs, progression is depending on human rescue instead of the curriculum doing its job.'],
              ['Session repairs', String(operationsReport.summary.sessionRepairs ?? 0), 'Runtime cleanup is useful, but a growing pile means delivery reliability still leaks.'],
              ['Urgent reward backlog', String(operationsReport.summary.rewardBacklogUrgent ?? ngoSummary.rewardOps?.summary?.urgentCount ?? 0), 'Approved or pending reward debt is still debt.'],
            ]}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Pods needing intervention first" eyebrow="Risk-ranked">
          <div style={{ display: 'grid', gap: 12 }}>
            {highestRiskPods.length ? highestRiskPods.map((pod) => (
              <div key={pod.id} style={{ padding: 16, borderRadius: 18, background: pod.watchCount > 0 || pod.attendanceAverage < 0.85 ? '#fff7ed' : '#f8fafc', border: `1px solid ${pod.watchCount > 0 || pod.attendanceAverage < 0.85 ? '#fed7aa' : '#eef2f7'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                  <strong>{pod.label}</strong>
                  <Pill label={`${pod.watchCount} watch`} tone={statusTone(pod.watchCount ? 'watch' : pod.readyCount ? 'ready' : 'on-track').tone} text={statusTone(pod.watchCount ? 'watch' : pod.readyCount ? 'ready' : 'on-track').text} />
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                  {pod.centerName} • {pod.rosterCount} learners • {Math.round(pod.attendanceAverage * 100)}% attendance • {Math.round(pod.masteryAverage * 100)}% mastery • {pod.assignmentCount} live assignment{pod.assignmentCount === 1 ? '' : 's'}.
                </div>
              </div>
            )) : (
              <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                Pod intervention cards are unavailable right now.
              </div>
            )}
          </div>
        </Card>

        <Card title="Mallams with strongest readiness lift" eyebrow="Positive outliers">
          <div style={{ display: 'grid', gap: 12 }}>
            {highestImpactMallams.length ? highestImpactMallams.map((mallam) => (
              <div key={mallam.id} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                  <strong>{mallam.displayName}</strong>
                  <Pill label={`${mallam.readinessCount} ready`} tone="#DCFCE7" text="#166534" />
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 8 }}>
                  {mallam.centerName ?? mallam.region} • {mallam.rosterCount} learners • {Math.round(mallam.attendanceAverage * 100)}% attendance • {Math.round(mallam.masteryAverage * 100)}% mastery.
                </div>
                <div style={{ color: '#475569', fontSize: 14 }}>
                  Watchlist still at {mallam.watchCount}. Good performance does not mean the queue clears itself.
                </div>
              </div>
            )) : (
              <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                Mallam contribution cards are unavailable right now.
              </div>
            )}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
