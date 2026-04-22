import Link from 'next/link';
import { CreateStudentForm, DeleteStudentForm, UpdateStudentForm } from '../../components/admin-forms';
import { LearnerMallamAssignmentForm } from '../../components/learner-mallam-assignment-form';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCohorts, fetchMallams, fetchPods, fetchStudents } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

export default async function StudentsPage() {
  const [students, cohorts, pods, mallams] = await Promise.all([
    fetchStudents(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
  ]);
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
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ModalLauncher
              buttonLabel="Add learner"
              title="Add learner"
              description="Create a learner without dumping a giant form into the roster page."
              eyebrow="Learner admin"
            >
              <CreateStudentForm cohorts={cohorts} pods={pods} mallams={mallams} />
            </ModalLauncher>
          </div>
          <Card title="Roster snapshot" eyebrow="Live API">
            <MetricList
              items={[
                { label: 'Learners', value: String(students.length) },
                { label: 'Active', value: String(activeStudents.length) },
                { label: 'Avg attendance', value: `${avgAttendance}%` },
              ]}
            />
          </Card>
        </div>
      }
    >
      <section style={{ ...responsiveGrid(260), marginBottom: 20 }}>
        {students.slice(0, 2).map((student) => (
          <LearnerMallamAssignmentForm key={`assign-${student.id}`} student={student} mallams={mallams} returnPath="/students" />
        ))}
        {students.slice(0, 2).map((student) => (
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
          <div key={`${student.id}-actions`} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href={`/students/${student.id}`} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>
                Open learner
              </Link>
              <Link href="/progress" style={{ color: '#0f766e', fontWeight: 800, textDecoration: 'none' }}>
                Open progress
              </Link>
            </div>
            <UpdateStudentForm student={student} cohorts={cohorts} pods={pods} mallams={mallams} title={`Edit ${student.name}`} embedded />
            <DeleteStudentForm student={student} embedded />
          </div>,
        ])}
      />
    </PageShell>
  );
}
