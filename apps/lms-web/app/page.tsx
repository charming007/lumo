import type { ReactNode } from 'react';
import { fetchAssignments, fetchDashboardInsights, fetchDashboardSummary, fetchMallams, fetchStudents, fetchWorkboard } from '../lib/api';
import { InsightPanel } from '../components/insight-panel';
import { KpiStrip } from '../components/kpi-strip';
import { Card, MetricList, PageShell, Pill, SimpleTable } from '../lib/ui';
import type { Assignment, DashboardInsight, DashboardSummary, Mallam, Student, WorkboardItem } from '../lib/types';

const EMPTY_SUMMARY: DashboardSummary = {
  activeLearners: 0,
  lessonsCompleted: 0,
  centers: 0,
  syncSuccessRate: 0,
  mallams: 0,
  activePods: 0,
  activeAssignments: 0,
  assessmentsLive: 0,
  learnersReadyToProgress: 0,
};

const FALLBACK_INSIGHT: DashboardInsight = {
  priority: 'Data connection',
  headline: 'Live dashboard data is temporarily unavailable',
  detail: 'The LMS is still reachable, but one or more dashboard feeds did not load. Retry once the API is back and use the sections below if any data did arrive.',
  metric: 'API retry needed',
};

function assignmentEmptyRow(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '', '']];
}

function workboardEmptyRow(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '', '', '', '']];
}

export default async function HomePage() {
  const [summaryResult, assignmentsResult, insightsResult, workboardResult, studentsResult, mallamsResult] = await Promise.allSettled([
    fetchDashboardSummary(),
    fetchAssignments(),
    fetchDashboardInsights(),
    fetchWorkboard(),
    fetchStudents(),
    fetchMallams(),
  ]);

  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : EMPTY_SUMMARY;
  const assignments: Assignment[] = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  const insights: DashboardInsight[] = insightsResult.status === 'fulfilled' ? insightsResult.value : [];
  const workboard: WorkboardItem[] = workboardResult.status === 'fulfilled' ? workboardResult.value : [];
  const students: Student[] = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const mallams: Mallam[] = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];

  const failedSources = [
    { label: 'summary', result: summaryResult },
    { label: 'assignments', result: assignmentsResult },
    { label: 'insights', result: insightsResult },
    { label: 'workboard', result: workboardResult },
    { label: 'students', result: studentsResult },
    { label: 'mallams', result: mallamsResult },
  ].filter((entry) => entry.result.status === 'rejected').map((entry) => entry.label);

  const stats = [
    { label: 'Active learners', value: String(summary.activeLearners) },
    { label: 'Mallams', value: String(summary.mallams), tone: '#0F766E' },
    { label: 'Active pods', value: String(summary.activePods), tone: '#2563EB' },
    { label: 'Ready to progress', value: String(summary.learnersReadyToProgress), tone: '#6C63FF' },
    { label: 'Assignments live', value: String(summary.activeAssignments) },
    { label: 'Assessments live', value: String(summary.assessmentsLive), tone: '#9333EA' },
    { label: 'Lessons completed', value: String(summary.lessonsCompleted) },
    { label: 'Sync success', value: `${Math.round(summary.syncSuccessRate * 100)}%`, tone: '#16A34A' },
  ];

  const topInsight = insights[0] ?? FALLBACK_INSIGHT;
  const atRiskLearners = students.filter((student) => student.attendanceRate < 0.85);
  const trainingMallams = mallams.filter((mallam) => mallam.status !== 'active');
  const partialOutageMessage = failedSources.length
    ? `Dashboard degraded gracefully: ${failedSources.join(', ')} data ${failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.`
    : null;

  return (
    <PageShell title="Dashboard" subtitle="A sharper LMS/admin cockpit for learner readiness, mallam supervision, content operations, pod delivery health, and visibly real operational workflows.">
      {partialOutageMessage ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          {partialOutageMessage}
        </div>
      ) : null}

      <KpiStrip items={stats} />

      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 20 }}>
        <InsightPanel headline={topInsight.headline} detail={topInsight.detail} metric={topInsight.metric} />
        <Card title="Operations pulse" eyebrow="This week">
          <MetricList
            items={[
              { label: 'Centers live', value: String(summary.centers) },
              { label: 'Assignments running', value: String(summary.activeAssignments) },
              { label: 'Assessment gates active', value: String(summary.assessmentsLive) },
              { label: 'Learners ready for progression', value: String(summary.learnersReadyToProgress) },
            ]}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '0.92fr 1.08fr', gap: 16, marginBottom: 20 }}>
        <Card title="Leadership cues" eyebrow="Priorities">
          <div style={{ display: 'grid', gap: 14 }}>
            {insights.length ? insights.map((item) => (
              <div key={item.priority} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                  <strong>{item.priority}</strong>
                  <Pill label={item.metric} />
                </div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{item.headline}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{item.detail}</div>
              </div>
            )) : (
              <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#64748b', lineHeight: 1.6 }}>
                No dashboard insights are available right now. The page stays up instead of faceplanting, which is frankly the more important feature during a demo.
              </div>
            )}
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card title="Live assignments" eyebrow="Delivery">
            <SimpleTable
              columns={['Lesson', 'Cohort', 'Pod', 'Assessment', 'Due']}
              rows={assignments.length ? assignments.map((assignment) => [
                assignment.lessonTitle,
                assignment.cohortName,
                assignment.podLabel ?? '—',
                assignment.assessmentTitle ?? '—',
                assignment.dueDate,
              ]) : assignmentEmptyRow('Assignments are unavailable right now.')}
            />
          </Card>
          <Card title="Escalations to clear" eyebrow="Admin watchlist">
            <div style={{ display: 'grid', gap: 12 }}>
              {!atRiskLearners.length && !trainingMallams.length ? (
                <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                  No escalation data is available right now.
                </div>
              ) : null}
              {atRiskLearners.map((student) => (
                <div key={student.id} style={{ padding: 14, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa' }}>
                  <strong>{student.name}</strong> is at {Math.round(student.attendanceRate * 100)}% attendance in {student.cohortName ?? 'an unassigned cohort'}.
                </div>
              ))}
              {trainingMallams.map((mallam) => (
                <div key={mallam.id} style={{ padding: 14, borderRadius: 16, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                  <strong>{mallam.displayName}</strong> is still {mallam.status}; deployment plan should be confirmed before adding more learners.
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <Card title="Learner workboard" eyebrow="Readiness queue">
        <SimpleTable
          columns={['Learner', 'Mallam', 'Cohort', 'Attendance', 'Mastery', 'Status', 'Next move']}
          rows={workboard.length ? workboard.map((item) => [
            item.studentName,
            item.mallamName ?? '—',
            item.cohortName ?? '—',
            `${Math.round(item.attendanceRate * 100)}%`,
            `${Math.round(item.mastery * 100)}% in ${item.focus}`,
            <Pill key={`${item.id}-status`} label={item.progressionStatus} tone={item.progressionStatus === 'ready' ? '#DCFCE7' : item.progressionStatus === 'watch' ? '#FEF3C7' : '#E0E7FF'} text={item.progressionStatus === 'ready' ? '#166534' : item.progressionStatus === 'watch' ? '#92400E' : '#3730A3'} />,
            item.recommendedNextModuleTitle ?? '—',
          ]) : workboardEmptyRow('Workboard data is unavailable right now.')}
        />
      </Card>
    </PageShell>
  );
}
