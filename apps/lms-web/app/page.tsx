import { fetchAssignments, fetchDashboardInsights, fetchDashboardSummary, fetchMallams, fetchStudents, fetchWorkboard } from '../lib/api';
import { InsightPanel } from '../components/insight-panel';
import { KpiStrip } from '../components/kpi-strip';
import { Card, MetricList, PageShell, Pill, SimpleTable } from '../lib/ui';

export default async function HomePage() {
  const [summary, assignments, insights, workboard, students, mallams] = await Promise.all([
    fetchDashboardSummary(),
    fetchAssignments(),
    fetchDashboardInsights(),
    fetchWorkboard(),
    fetchStudents(),
    fetchMallams(),
  ]);

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

  const topInsight = insights[0];
  const atRiskLearners = students.filter((student) => student.attendanceRate < 0.85);
  const trainingMallams = mallams.filter((mallam) => mallam.status !== 'active');

  return (
    <PageShell title="Dashboard" subtitle="A sharper LMS/admin cockpit for learner readiness, mallam supervision, content operations, pod delivery health, and visibly real operational workflows.">
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
            {insights.map((item) => (
              <div key={item.priority} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                  <strong>{item.priority}</strong>
                  <Pill label={item.metric} />
                </div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{item.headline}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card title="Live assignments" eyebrow="Delivery">
            <SimpleTable
              columns={['Lesson', 'Cohort', 'Pod', 'Assessment', 'Due']}
              rows={assignments.map((assignment) => [
                assignment.lessonTitle,
                assignment.cohortName,
                assignment.podLabel ?? '—',
                assignment.assessmentTitle ?? '—',
                assignment.dueDate,
              ])}
            />
          </Card>
          <Card title="Escalations to clear" eyebrow="Admin watchlist">
            <div style={{ display: 'grid', gap: 12 }}>
              {atRiskLearners.map((student) => (
                <div key={student.id} style={{ padding: 14, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa' }}>
                  <strong>{student.name}</strong> is at {Math.round(student.attendanceRate * 100)}% attendance in {student.cohortName}.
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
          rows={workboard.map((item) => [
            item.studentName,
            item.mallamName ?? '—',
            item.cohortName ?? '—',
            `${Math.round(item.attendanceRate * 100)}%`,
            `${Math.round(item.mastery * 100)}% in ${item.focus}`,
            <Pill key={`${item.id}-status`} label={item.progressionStatus} tone={item.progressionStatus === 'ready' ? '#DCFCE7' : item.progressionStatus === 'watch' ? '#FEF3C7' : '#E0E7FF'} text={item.progressionStatus === 'ready' ? '#166534' : item.progressionStatus === 'watch' ? '#92400E' : '#3730A3'} />,
            item.recommendedNextModuleTitle ?? '—',
          ])}
        />
      </Card>
    </PageShell>
  );
}