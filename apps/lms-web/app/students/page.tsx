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
          <div key={`${student.id}-actions`} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href={`/students/${student.id}`} title="View learner" aria-label="View learner" style={{ textDecoration: 'none', borderRadius: 10, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730A3', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
              👁
            </Link>
            <ModalLauncher
              buttonLabel={<span aria-hidden="true">✏️</span>}
              title={`Edit ${student.name}`}
              description="Update learner details without blowing up the table layout."
              eyebrow="Learner admin"
              triggerStyle={{ borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}
            >
              <UpdateStudentForm student={student} cohorts={cohorts} pods={pods} mallams={mallams} title={`Edit ${student.name}`} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel={<span aria-hidden="true">🗑️</span>}
              title={`Delete ${student.name}`}
              description="Remove this learner from the live roster carefully."
              eyebrow="Danger zone"
              triggerStyle={{ borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}
            >
              <DeleteStudentForm student={student} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel={<span aria-hidden="true">🧭</span>}
              title={`Assign mallam for ${student.name}`}
              description="Change or clear learner ownership from a focused popup."
              eyebrow="Learner routing"
              triggerStyle={{ borderRadius: 10, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#166534', width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: 0, fontSize: 16 }}
            >
              <LearnerMallamAssignmentForm student={student} mallams={mallams} returnPath="/students" />
            </ModalLauncher>
          </div>,
        ])}
      />
    </PageShell>
  );
}
