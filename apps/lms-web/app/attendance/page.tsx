import { fetchAttendance } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

export default async function AttendancePage() {
  const records = await fetchAttendance();
  const present = records.filter((record) => (record.status || '').toLowerCase() === 'present');

  return (
    <PageShell
      title="Attendance"
      subtitle="Review attendance signals across learners, pods, and mallams from the live operations feed."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Attendance snapshot" eyebrow="Live API">
          <MetricList
            items={[
              { label: 'Records', value: String(records.length) },
              { label: 'Present', value: String(present.length) },
              { label: 'Attendance rate', value: records.length ? `${Math.round((present.length / records.length) * 100)}%` : '0%' },
            ]}
          />
        </Card>
      }
    >
      <section style={{ ...responsiveGrid(260), marginBottom: 20 }}>
        <Card title="Live attendance posture" eyebrow="Operations">
          <div style={{ color: '#475569', lineHeight: 1.7 }}>
            This surface shows the raw attendance feed instead of bouncing operators into Progress. Use it to spot pods or learners slipping before completion metrics hide the damage.
          </div>
        </Card>
      </section>

      <SimpleTable
        columns={['Learner', 'Date', 'Status', 'Pod', 'Mallam', 'Rate']}
        rows={records.map((record) => [
          record.studentName || record.studentId || 'Unknown learner',
          record.date || '—',
          <Pill key={`${record.id}-status`} label={record.status || 'Unknown'} tone="#F8FAFC" text="#334155" />,
          record.podLabel || '—',
          record.mallamName || '—',
          percent(record.attendanceRate),
        ])}
      />
    </PageShell>
  );
}
