import { AttendanceCaptureForm } from '../../components/attendance-form';
import { fetchAttendance, fetchStudents } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

export const dynamic = 'force-dynamic';

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

function routeAlert(message: string, tone: 'warning' | 'error' = 'warning') {
  const palette = tone === 'error'
    ? { background: '#FEF2F2', border: '#FCA5A5', text: '#B91C1C' }
    : { background: '#FFF7ED', border: '#FDBA74', text: '#9A3412' };

  return (
    <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: palette.background, border: `1px solid ${palette.border}`, color: palette.text, fontWeight: 700, lineHeight: 1.6 }}>
      {message}
    </div>
  );
}

export default async function AttendancePage() {
  const [recordsResult, studentsResult] = await Promise.allSettled([
    fetchAttendance(),
    fetchStudents(),
  ]);

  const records = recordsResult.status === 'fulfilled' ? recordsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const failedSources = [
    recordsResult.status === 'rejected' ? 'attendance records' : null,
    studentsResult.status === 'rejected' ? 'students' : null,
  ].filter(Boolean);

  const present = records.filter((record) => (record.status || '').toLowerCase() === 'present');
  const canCaptureAttendance = students.length > 0;

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
      {failedSources.length ? routeAlert(`Attendance is running in degraded mode: ${failedSources.join(', ')} ${failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable. Keeping the route up is safer than a 500, but do not treat missing rows as clean attendance until those feeds recover.`, recordsResult.status === 'rejected' ? 'error' : 'warning') : null}

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        {canCaptureAttendance ? (
          <AttendanceCaptureForm students={students} />
        ) : (
          <Card title="Capture attendance" eyebrow="Unavailable right now">
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>
              Attendance capture is paused until the learner roster loads again. Better a loud pause than writing attendance against missing learner context.
            </div>
          </Card>
        )}
        <Card title="Live attendance posture" eyebrow="Operations">
          <div style={{ color: '#475569', lineHeight: 1.7 }}>
            This surface shows the raw attendance feed instead of bouncing operators into Progress. Use it to spot pods or learners slipping before completion metrics hide the damage.
          </div>
        </Card>
      </section>

      <SimpleTable
        columns={['Learner', 'Date', 'Status']}
        rows={records.length ? records.map((record) => [
          record.studentName || 'Unknown learner',
          record.date || '—',
          <Pill key={`${record.id}-status`} label={record.status || 'Unknown'} tone="#F8FAFC" text="#334155" />,
        ]) : [[<span key="empty" style={{ color: '#64748b' }}>{failedSources.length ? 'Attendance feed unavailable right now.' : 'No attendance records yet.'}</span>, '', '']]}
      />
    </PageShell>
  );
}
