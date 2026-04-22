import Link from 'next/link';
import { fetchStudents } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

export default async function StudentsPage() {
  const students = await fetchStudents();
  const activeStudents = students.filter((student) => (student.stage || '').toLowerCase() !== 'inactive');
  const avgAttendance = students.length
    ? Math.round(students.reduce((sum, student) => sum + (Number(student.attendanceRate) || 0), 0) / students.length)
    : 0;

  return (
    <PageShell
      title="Students"
      subtitle="Track learner roster health, attendance, pods, and mallam assignment from one place."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Roster snapshot" eyebrow="Live API">
          <MetricList
            items={[
              { label: 'Learners', value: String(students.length) },
              { label: 'Active', value: String(activeStudents.length) },
              { label: 'Avg attendance', value: `${avgAttendance}%` },
            ]}
          />
        </Card>
      }
    >
      <section style={{ ...responsiveGrid(260), marginBottom: 20 }}>
        {students.slice(0, 3).map((student) => (
          <Card key={student.id} title={student.name} eyebrow={student.level || 'Learner'}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={student.stage || 'Stage not set'} tone="#EEF2FF" text="#3730A3" />
                <Pill label={student.cohortName || 'No cohort'} tone="#ECFDF5" text="#166534" />
              </div>
              <div style={{ color: '#475569', lineHeight: 1.6 }}>
                Pod: <strong>{student.podLabel || 'Unassigned'}</strong><br />
                Mallam: <strong>{student.mallamName || 'Unassigned'}</strong><br />
                Attendance: <strong>{percent(student.attendanceRate)}</strong>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <SimpleTable
        columns={['Learner', 'Stage', 'Cohort', 'Pod', 'Mallam', 'Attendance', 'Actions']}
        rows={students.map((student) => [
          <div key={`${student.id}-name`}>
            <strong>{student.name}</strong>
            <div style={{ color: '#64748b', marginTop: 4 }}>Age {student.age || '—'} · {student.gender || 'N/A'}</div>
          </div>,
          <Pill key={`${student.id}-stage`} label={student.stage || 'Unknown'} tone="#F8FAFC" text="#334155" />,
          student.cohortName || '—',
          student.podLabel || '—',
          student.mallamName || '—',
          percent(student.attendanceRate),
          <Link key={`${student.id}-link`} href="/progress" style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>
            Open progress
          </Link>,
        ])}
      />
    </PageShell>
  );
}
