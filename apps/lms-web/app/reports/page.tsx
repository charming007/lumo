import { fetchDashboardInsights, fetchReportsOverview } from '../../lib/api';
import { Card, MetricList, PageShell, Pill } from '../../lib/ui';

export default async function ReportsPage() {
  const [report, insights] = await Promise.all([fetchReportsOverview(), fetchDashboardInsights()]);

  return (
    <PageShell title="Reports" subtitle="Program, donor, and government-ready reporting with clearer operational signals instead of fluffy placeholders.">
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
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
              { label: 'Present today', value: String(report.presentToday) },
              { label: 'Average attendance', value: `${Math.round(report.averageAttendance * 100)}%` },
              { label: 'Pods needing attention', value: String(report.podsNeedingAttention) },
            ]}
          />
        </Card>
        <Card title="Learning metrics" eyebrow="Outcomes">
          <MetricList
            items={[
              { label: 'Average mastery', value: `${Math.round(report.averageMastery * 100)}%` },
              { label: 'Ready to progress', value: String(report.readinessCount) },
              { label: 'On-track learners', value: String(report.onTrackCount) },
              { label: 'Watchlist learners', value: String(report.watchCount) },
            ]}
          />
        </Card>
      </section>

      <Card title="Executive narrative" eyebrow="What changed">
        <div style={{ display: 'grid', gap: 14 }}>
          {insights.map((item) => (
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
    </PageShell>
  );
}
