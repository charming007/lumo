import type { ReactNode } from 'react';
import type { DashboardInsight, ReportsOverview } from '../../lib/types';
import { fetchAssignments, fetchDashboardInsights, fetchMallams, fetchPods, fetchProgress, fetchReportsOverview, fetchStudents } from '../../lib/api';
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

export default async function ReportsPage() {
  const [reportResult, insightsResult, studentsResult, mallamsResult, podsResult, assignmentsResult, progressResult] = await Promise.allSettled([
    fetchReportsOverview(),
    fetchDashboardInsights(),
    fetchStudents(),
    fetchMallams(),
    fetchPods(),
    fetchAssignments(),
    fetchProgress(),
  ]);

  const report = reportResult.status === 'fulfilled' ? reportResult.value : EMPTY_REPORT;
  const insights = insightsResult.status === 'fulfilled' ? insightsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  const progress = progressResult.status === 'fulfilled' ? progressResult.value : [];

  const failedSources = [
    reportResult.status === 'rejected' ? 'report metrics' : null,
    insightsResult.status === 'rejected' ? 'executive narrative' : null,
    studentsResult.status === 'rejected' ? 'learners' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    assignmentsResult.status === 'rejected' ? 'assignments' : null,
    progressResult.status === 'rejected' ? 'progress' : null,
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
    ? `${Math.round(report.averageAttendance * 100)}% average attendance suggests ${report.averageAttendance >= 0.9 ? 'strong' : report.averageAttendance >= 0.85 ? 'stable' : 'fragile'} retention`
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

  return (
    <PageShell title="Reports" subtitle="Program, donor, and government-ready analytics with operational depth: pod health, mallam contribution, assignment pressure, progression reality, and cleaner NGO reporting in one place.">
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Reports is running in degraded mode: {failedSources.join(' + ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}
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
              { label: 'Average attendance', value: `${Math.round(report.averageAttendance * 100)}%` },
              { label: 'Average mastery', value: `${Math.round(report.averageMastery * 100)}%` },
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
              { label: 'Mallams with ready learners', value: String(mallamSnapshots.filter((item) => item.readinessCount > 0).length) },
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
                mallam.displayName,
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
