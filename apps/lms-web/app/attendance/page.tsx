import type { ReactNode } from 'react';
import { AttendanceCaptureForm } from '../../components/attendance-form';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchAttendance, fetchStudents } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

function emptyAttendanceRows(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '']];
}

export default async function AttendancePage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [attendanceResult, studentsResult] = await Promise.allSettled([fetchAttendance(), fetchStudents()]);
  const attendance = attendanceResult.status === 'fulfilled' ? attendanceResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const presentCount = attendance.filter((item) => item.status === 'present').length;
  const lateCount = attendance.filter((item) => item.status === 'late').length;
  const absentCount = attendance.filter((item) => item.status === 'absent').length;
  const failedSources = [
    attendanceResult.status === 'rejected' ? 'attendance board' : null,
    studentsResult.status === 'rejected' ? 'learner roster' : null,
  ].filter(Boolean);

  return (
    <PageShell title="Attendance" subtitle="Daily learner attendance tracking for facilitators and teachers.">
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Attendance is running in degraded mode: {failedSources.join(' + ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Attendance board" eyebrow="Today + recent capture">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 14, borderRadius: 16, background: '#DCFCE7' }}><strong>{presentCount}</strong><div style={{ color: '#166534' }}>Present</div></div>
            <div style={{ padding: 14, borderRadius: 16, background: '#FEF3C7' }}><strong>{lateCount}</strong><div style={{ color: '#92400E' }}>Late</div></div>
            <div style={{ padding: 14, borderRadius: 16, background: '#FEE2E2' }}><strong>{absentCount}</strong><div style={{ color: '#991B1B' }}>Absent</div></div>
          </div>
          <SimpleTable columns={['Student', 'Date', 'Status']} rows={attendance.length ? attendance.map((item) => [item.studentName, item.date, <Pill key={item.id} label={item.status} tone={item.status === 'present' ? '#DCFCE7' : item.status === 'late' ? '#FEF3C7' : '#FEE2E2'} text={item.status === 'present' ? '#166534' : item.status === 'late' ? '#92400E' : '#991B1B'} />]) : emptyAttendanceRows('Attendance records are unavailable right now.')} />
        </Card>
        {students.length ? (
          <AttendanceCaptureForm students={students} />
        ) : (
          <Card title="Capture attendance" eyebrow="Unavailable right now">
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>
              The learner roster did not load, so new attendance cannot be captured safely yet. The board still stays visible instead of nuking the page.
            </div>
          </Card>
        )}
      </section>
    </PageShell>
  );
}
