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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function asRecord(value: unknown) {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function readString(record: Record<string, unknown>, key: string, fallback = '—') {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function readNumber(record: Record<string, unknown>, key: string, fallback = 0) {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readDate(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== 'string' || !value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export default async function ReportsPage() {
  const [reportResult, insightsResult, studentsResult, mallamsResult, podsResult, assignmentsResult, progressResult, operationsResult] = await Promise.allSettled([
    fetchReportsOverview(),
    fetchDashboardInsights(),
    fetchStudents(),
    fetchMallams(),
    fetchPods(),
    fetchAssignments(),
    fetchProgress(),
    fetchOperationsReport(10),
  ]);

  const report = reportResult.status === 'fulfilled' ? reportResult.value : EMPTY_REPORT;
  const insights = insightsResult.status === 'fulfilled' ? insightsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  const progress = progressResult.status === 'fulfilled' ? progressResult.value : [];
  const operationsReport = operationsResult.status === 'fulfilled' ? operationsResult.value : EMPTY_OPERATIONS_REPORT;

  const failedSources = [
    reportResult.status === 'rejected' ? 'report metrics' : null,
    insightsResult.status === 'rejected' ? 'executive narrative' : null,
    studentsResult.status === 'rejected' ? 'learners' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    assignmentsResult.status === 'rejected' ? 'assignments' : null,
    progressResult.status === 'rejected' ? 'progress' : null,
    operationsResult.status === 'rejected' ? 'operations report' : null,
  ].filter(Boolean);

  const podSnapshots = pods.map((pod) => {
    const podStudents = students.filter((student) => student.podId === pod.id);
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
  });

  const mallamSnapshots = mallams.map((mallam) => {
    const roster = students.filter((student) => student.mallamId === mallam.id);
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
  });

  const highestRiskPods = [...podSnapshots]
    .sort((a, b) => (b.watchCount - a.watchCount) || (a.attendanceAverage - b.attendanceAverage))
    .slice(0, 5);

  const highestImpactMallams = [...mallamSnapshots]
    .sort((a, b) => (b.readinessCount - a.readinessCount) || (b.rosterCount - a.rosterCount))
    .slice(0, 5);

  const assignmentPressure = assignments.reduce<Record<string, number>>((acc, assignment) => {
    const key = assignment.teacherName || 'Unassigned';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const donorCoverage = report.totalStudents > 0 && report.totalCenters > 0
    ? `${report.totalStudents} learners across ${report.totalCenters} center${report.totalCenters === 1 ? '' : 's'}`
    : 'Coverage feed unavailable';
  const learnerRetentionSignal = report.totalStudents > 0
    ? `${formatPercent(report.averageAttendance)} average attendance suggests ${report.averageAttendance >= 0.9 ? 'strong' : report.averageAttendance >= 0.85 ? 'stable' : 'fragile'} retention`
    : 'Retention signal unavailable';
  const readinessSignal = report.readinessCount > 0
    ? `${report.readinessCount} learners are ready to progress with ${report.watchCount} still on watch`
    : 'No progression-ready learners visible yet';
  const staffingSignal = mallamSnapshots.length
    ? `${mallamSnapshots.filter((mallam) => mallam.watchCount > 0).length} mallams are carrying watchlist load`
    : 'Staffing signal unavailable';

  const donorNarratives = [
    {
      title: 'Coverage and reach',
      detail: donorCoverage,
      tone: '#EEF2FF',
      text: '#3730A3',
    },
    {
      title: 'Attendance retention signal',
      detail: learnerRetentionSignal,
      tone: '#ECFDF5',
      text: '#166534',
    },
    {
      title: 'Progression readiness signal',
      detail: readinessSignal,
      tone: '#FFF7ED',
      text: '#9A3412',
    },
    {
      title: 'Facilitator pressure signal',
      detail: staffingSignal,
      tone: '#F8FAFC',
      text: '#334155',
    },
  ];

  const complianceRows = [
    ['Learner attendance logged', `${report.presentToday}/${report.totalStudents || 0} present today`, report.totalStudents ? `${Math.round((report.presentToday / report.totalStudents) * 100)}% capture` : 'No capture'],
    ['Assignments tracked', `${report.totalAssignments} live`, `${report.assignmentsDueThisWeek} due this week`],
    ['Pods under watch', `${report.podsNeedingAttention} flagged`, `${podSnapshots.filter((item) => item.attendanceAverage < 0.85).length} below 85% attendance`],
    ['Promotion evidence', `${report.readinessCount} ready`, `${report.watchCount} watchlist`],
  ];

  const rewardQueueCards = operationsReport.hotlist.rewardQueue.map((entry, index) => {
    const record = asRecord(entry);
    return {
      key: readString(record, 'id', `reward-${index}`),
      learnerName: readString(record, 'learnerName', readString(record, 'studentName', 'Unknown learner')),
      rewardTitle: readString(record, 'rewardTitle', 'Reward item'),
      status: readString(record, 'status', 'pending'),
      ageDays: readNumber(record, 'ageDays', 0),
      xpCost: readNumber(record, 'xpCost', 0),
      requestedAt: readDate(record, 'createdAt'),
    };
  });

  const runtimeCards = operationsReport.hotlist.runtimeLearners.map((entry, index) => {
    const record = asRecord(entry);
    return {
      key: readString(record, 'id', `runtime-${index}`),
      learnerName: readString(record, 'studentName', 'Unknown learner'),
      status: readString(record, 'status', 'runtime'),
      completionRate: readNumber(record, 'completionRate', 0),
      abandonedSessions: readNumber(record, 'abandonedSessions', 0),
      lastActiveAt: readDate(record, 'lastActiveAt'),
    };
  });

  const recentRewardAdjustments = operationsReport.recent.rewardAdjustments.slice(0, 5).map((entry, index) => {
    const record = asRecord(entry);
    return {
      key: readString(record, 'id', `adjustment-${index}`),
      learnerName: readString(record, 'studentName', 'Unknown learner'),
      label: readString(record, 'label', readString(record, 'kind', 'Reward adjustment')),
      xpDelta: readNumber(record, 'xpDelta', 0),
      createdAt: readDate(record, 'createdAt'),
    };
  });

  return (
    <PageShell title="Reports" subtitle="Program, donor, and government-ready analytics with operational depth: pod health, mallam contribution, assignment pressure, progression reality, and cleaner NGO reporting in one place.">
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Reports is running in degraded mode: {failedSources.join(' + ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ marginBottom: 20, padding: 18, borderRadius: 24, background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#64748b', marginBottom: 8 }}>Operator launchpad</div>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              This page is now more than a dashboard selfie. Use it to spot the problem, then jump straight to the board that can actually fix it: mallam coverage, reward queue, or content blockers.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href="/mallams" style={{ borderRadius: 14, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>Open mallam ops</Link>
            <Link href="/rewards" style={{ borderRadius: 14, padding: '12px 14px', fontWeight: 700, background: '#F5F3FF', color: '#6D28D9', textDecoration: 'none' }}>Open rewards queue</Link>
            <Link href="/content?view=blocked" style={{ borderRadius: 14, padding: '12px 14px', fontWeight: 700, background: '#FFF7ED', color: '#9A3412', textDecoration: 'none' }}>Open release blockers</Link>
          </div>
        </div>
      </section>

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Program overview" eyebrow="Coverage">
          <MetricList
            items={[
              { label: 'Total learners', value: String(report.totalStudents) },
              { label: 'Mallams and facilitators', value: String(report.totalTeachers) },
              { label: 'Centers live', value: String(report.totalCenters) },
              { label: 'Active pods', value: String(report.activePods) },
            ]}
          />
        </Card>
        <Card title="Delivery metrics" eyebrow="Execution">
          <MetricList
            items={[
              { label: 'Assignments tracked', value: String(report.totalAssignments) },
              { label: 'Assignments due this week', value: String(report.assignmentsDueThisWeek) },
              { label: 'Present today', value: String(report.presentToday) },
              { label: 'Pods needing attention', value: String(report.podsNeedingAttention) },
            ]}
          />
        </Card>
        <Card title="Learning metrics" eyebrow="Outcomes">
          <MetricList
            items={[
              { label: 'Average attendance', value: formatPercent(report.averageAttendance) },
              { label: 'Average mastery', value: formatPercent(report.averageMastery) },
              { label: 'Ready to progress', value: String(report.readinessCount) },
              { label: 'Watchlist learners', value: String(report.watchCount) },
            ]}
          />
        </Card>
        <Card title="Narrative signals" eyebrow="What leadership should not miss">
          <MetricList
            items={[
              { label: 'Top assignment owner load', value: String(Math.max(0, ...Object.values(assignmentPressure))) },
              { label: 'Pods under 85% attendance', value: String(podSnapshots.filter((item) => item.attendanceAverage < 0.85).length) },
              { label: 'Mallams with ready learners', value: String(mallamSnapshots.filter((mallam) => mallam.readinessCount > 0).length) },
              { label: 'Pods with zero live assignments', value: String(podSnapshots.filter((item) => item.assignmentCount === 0).length) },
            ]}
          />
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
              ['Assignment load needs taste', 'The same operator carrying every live assignment is not evidence of excellence. It is usually evidence of poor distribution.'],
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
          <SimpleTable
            columns={['Check', 'Current state', 'Signal']}
            rows={complianceRows}
          />
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

        <Card title="Operations summary" eyebrow="Runtime consistency + reward pressure">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Completion rate', formatPercent(operationsReport.summary.runtimeCompletionRate)],
              ['Abandoned sessions', String(operationsReport.summary.runtimeAbandonedSessions)],
              ['Pending reward requests', String(operationsReport.summary.rewardPendingRequests)],
              ['Integrity issues', String(operationsReport.summary.integrityIssueCount)],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #eef2f7' }}>
                <span style={{ color: '#64748b' }}>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', lineHeight: 1.7 }}>
              This panel is wired to the combined operations report now, so runtime drop-off, progression pressure, reward queue health, and integrity noise are finally read from one place instead of stitched together by vibes.
            </div>
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Mallam pressure board" eyebrow="Who needs coaching or relief first">
          <SimpleTable
            columns={['Mallam', 'Center', 'Roster', 'Attendance', 'Ready', 'Watch', 'Recommended move']}
            rows={highestImpactMallams.length ? highestImpactMallams.map((mallam) => [
              <Link key={mallam.id} href={`/mallams/${mallam.id}`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 800 }}>{mallam.displayName}</Link>,
              mallam.centerName ?? mallam.region,
              String(mallam.rosterCount),
              formatPercent(mallam.attendanceAverage),
              String(mallam.readinessCount),
              String(mallam.watchCount),
              mallam.watchCount > 0 ? 'Coach and trim watchlist load' : mallam.rosterCount >= 18 ? 'Check capacity before adding more learners' : 'Keep this coverage pattern stable',
            ]) : safeRows('Mallam contribution analytics are unavailable right now.', 7)}
          />
        </Card>

        <Card title="Reward queue pressure" eyebrow="What finance-ish ops should clear next">
          <div style={{ display: 'grid', gap: 12 }}>
            {rewardQueueCards.length ? rewardQueueCards.slice(0, 5).map((item) => (
              <div key={item.key} style={{ padding: 16, borderRadius: 18, background: item.ageDays >= 3 ? '#fff7ed' : '#f8fafc', border: `1px solid ${item.ageDays >= 3 ? '#fed7aa' : '#eef2f7'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <strong>{item.rewardTitle}</strong>
                  <Pill label={`${item.status} · ${item.ageDays.toFixed(1)}d`} tone={item.ageDays >= 3 ? '#FEE2E2' : item.ageDays >= 1 ? '#FEF3C7' : '#DCFCE7'} text={item.ageDays >= 3 ? '#991B1B' : item.ageDays >= 1 ? '#92400E' : '#166534'} />
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                  {item.learnerName} • {item.xpCost} XP • requested {item.requestedAt}
                </div>
              </div>
            )) : (
              <div style={{ padding: 14, borderRadius: 16, background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534', lineHeight: 1.6 }}>
                Reward queue hotlist is clear or currently unavailable.
              </div>
            )}
            <Link href="/rewards" style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>Open full reward operations board →</Link>
          </div>
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
              formatPercent(pod.attendanceAverage),
              formatPercent(pod.masteryAverage),
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
                mallam.displayName,
                mallam.centerName ?? mallam.region,
                String(mallam.rosterCount),
                formatPercent(mallam.attendanceAverage),
                formatPercent(mallam.masteryAverage),
                String(mallam.readinessCount),
                String(mallam.watchCount),
                <Pill key={mallam.id} label={mallam.status} tone={tone.tone} text={tone.text} />,
              ];
            }) : safeRows('Mallam analytics are unavailable right now.', 8)}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Runtime intervention queue" eyebrow="Learners falling out of sessions">
          <div style={{ display: 'grid', gap: 12 }}>
            {runtimeCards.length ? runtimeCards.slice(0, 5).map((item) => (
              <div key={item.key} style={{ padding: 16, borderRadius: 18, background: item.abandonedSessions > 0 ? '#fff7ed' : '#f8fafc', border: `1px solid ${item.abandonedSessions > 0 ? '#fed7aa' : '#eef2f7'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                  <strong>{item.learnerName}</strong>
                  <Pill label={`${Math.round(item.completionRate * 100)}% completion`} tone={item.completionRate >= 0.8 ? '#DCFCE7' : item.completionRate >= 0.6 ? '#FEF3C7' : '#FEE2E2'} text={item.completionRate >= 0.8 ? '#166534' : item.completionRate >= 0.6 ? '#92400E' : '#991B1B'} />
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                  {item.abandonedSessions} abandoned session{item.abandonedSessions === 1 ? '' : 's'} • last active {item.lastActiveAt} • status {item.status}
                </div>
              </div>
            )) : (
              <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                Runtime learner hotlist is unavailable right now.
              </div>
            )}
          </div>
        </Card>

        <Card title="Recent reward adjustments" eyebrow="Manual interventions worth auditing">
          <SimpleTable
            columns={['Learner', 'Adjustment', 'XP delta', 'When']}
            rows={recentRewardAdjustments.length ? recentRewardAdjustments.map((item) => [item.learnerName, item.label, `${item.xpDelta > 0 ? '+' : ''}${item.xpDelta}`, item.createdAt]) : safeRows('No recent manual reward adjustments are visible.', 4)}
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
                  {pod.centerName} • {pod.rosterCount} learners • {formatPercent(pod.attendanceAverage)} attendance • {formatPercent(pod.masteryAverage)} mastery • {pod.assignmentCount} live assignment{pod.assignmentCount === 1 ? '' : 's'}.
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
                  {mallam.centerName ?? mallam.region} • {mallam.rosterCount} learners • {formatPercent(mallam.attendanceAverage)} attendance • {formatPercent(mallam.masteryAverage)} mastery.
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
