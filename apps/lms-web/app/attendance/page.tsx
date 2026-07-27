import type { ReactNode } from 'react';
import { AttendanceCaptureForm } from '../../components/attendance-form';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { fetchAttendance, fetchStudents } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

export const dynamic = 'force-dynamic';

function emptyAttendanceRows(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '']];
}

export default async function AttendancePage() {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Attendance"
        subtitle="Production wiring is incomplete, so attendance operations are blocked instead of pretending the register is trustworthy."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: attendance API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} the attendance register cannot be trusted for daily presence checks, pod escalation, or mallam follow-up. Fix the env var, redeploy, then verify live attendance data.
          </>
        )}
        whyBlocked={[
          'Attendance is a live operations surface. Quiet empty rows here would read like perfect attendance when the page is actually disconnected.',
          'Capture depends on real learner data. If the backend wiring is wrong, write actions become dangerous theatre instead of reliable record-keeping.',
        ]}
        verificationItems={[
          {
            surface: 'Attendance register',
            expected: 'Live learner attendance rows load from the backend with current statuses',
            failure: 'Blank or tiny register that only looks calm because the LMS never connected to production data',
          },
          {
            surface: 'Attendance capture',
            expected: 'Learner options load before marking attendance and new records appear after submit',
            failure: 'Form renders without live learners or submits into the void',
          },
          {
            surface: 'Dashboard + progress cross-check',
            expected: 'Attendance changes match the same learners and pods seen elsewhere in the LMS',
            failure: 'Attendance appears isolated, stale, or inconsistent with the rest of the dashboard',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Progress', href: '/progress', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const [recordsResult, studentsResult] = await Promise.allSettled([
    fetchAttendance(),
    fetchStudents(),
  ]);

  const records = recordsResult.status === 'fulfilled' ? recordsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const failedSources = [
    recordsResult.status === 'rejected' ? 'attendance register' : null,
    studentsResult.status === 'rejected' ? 'learner roster' : null,
  ].filter(Boolean);
  const present = records.filter((record) => (record.status || '').toLowerCase() === 'present');
  const captureDisabled = students.length === 0;

  return (
    <PageShell
      title="Attendance"
      subtitle="Review attendance signals across learners, pods, and mallams from the live operations feed."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Attendance snapshot" eyebrow={failedSources.length ? 'Degraded mode' : 'Live API'}>
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
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Attendance is running in degraded mode: {failedSources.join(' and ')} {failedSources.length === 1 ? 'is' : 'are'} unavailable.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Attendance capture" eyebrow={captureDisabled ? 'Capture paused' : 'Live write path'}>
          {captureDisabled ? (
            <div style={{ color: '#9a3412', lineHeight: 1.7, fontWeight: 700 }}>
              Learner roster is unavailable right now, so attendance capture is paused instead of risking marks against missing or stale records.
            </div>
          ) : (
            <AttendanceCaptureForm students={students} />
          )}
        </Card>
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
        ]) : emptyAttendanceRows(failedSources.length ? 'Attendance records are temporarily unavailable.' : 'No attendance records yet.')}
      />
    </PageShell>
  );
}
