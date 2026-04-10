import { AttendanceCaptureForm } from '../../components/attendance-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchAttendance, fetchStudents } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

export default async function AttendancePage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [attendance, students] = await Promise.all([fetchAttendance(), fetchStudents()]);
  const presentCount = attendance.filter((item) => item.status === 'present').length;
  const lateCount = attendance.filter((item) => item.status === 'late').length;
  const absentCount = attendance.filter((item) => item.status === 'absent').length;

  return (
    <PageShell title="Attendance" subtitle="Daily learner attendance tracking for facilitators and teachers.">
      <FeedbackBanner message={query?.message} />
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Attendance board" eyebrow="Today + recent capture">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 14, borderRadius: 16, background: '#DCFCE7' }}><strong>{presentCount}</strong><div style={{ color: '#166534' }}>Present</div></div>
            <div style={{ padding: 14, borderRadius: 16, background: '#FEF3C7' }}><strong>{lateCount}</strong><div style={{ color: '#92400E' }}>Late</div></div>
            <div style={{ padding: 14, borderRadius: 16, background: '#FEE2E2' }}><strong>{absentCount}</strong><div style={{ color: '#991B1B' }}>Absent</div></div>
          </div>
          <SimpleTable columns={['Student', 'Date', 'Status']} rows={attendance.map((item) => [item.studentName, item.date, <Pill key={item.id} label={item.status} tone={item.status === 'present' ? '#DCFCE7' : item.status === 'late' ? '#FEF3C7' : '#FEE2E2'} text={item.status === 'present' ? '#166534' : item.status === 'late' ? '#92400E' : '#991B1B'} />])} />
        </Card>
        <AttendanceCaptureForm students={students} />
      </section>
    </PageShell>
  );
}
