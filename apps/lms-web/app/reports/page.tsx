import { fetchNgoSummary, fetchOperationsReport, fetchReportsOverview, fetchRewardsReport } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

export default async function ReportsPage() {
  const [overview, ngoSummary, operations, rewards] = await Promise.all([
    fetchReportsOverview(),
    fetchNgoSummary(),
    fetchOperationsReport(8),
    fetchRewardsReport(8),
  ]);

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

      <Card title="Operational hotlist" eyebrow="Operations report">
        <SimpleTable
          columns={['Learner', 'Cohort', 'Pod', 'Status', 'XP', 'Badges']}
          rows={[...(operations.hotlist.readyLearners || []), ...(operations.hotlist.watchLearners || [])].map((item) => [
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
