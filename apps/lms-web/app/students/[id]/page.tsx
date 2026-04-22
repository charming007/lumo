import { notFound } from 'next/navigation';
import { DeleteStudentForm, UpdateStudentForm } from '../../../components/admin-forms';
import { LearnerMallamAssignmentForm } from '../../../components/learner-mallam-assignment-form';
import { fetchCohorts, fetchMallams, fetchPods, fetchStudents } from '../../../lib/api';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../../lib/ui';

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [students, cohorts, pods, mallams] = await Promise.all([
    fetchStudents(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
  ]);

  const student = students.find((item) => item.id === id);
  if (!student) notFound();

  return (
    <PageShell
      title={student.name}
      subtitle="Learner admin detail for roster edits, mallam assignment, and deletion controls."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Students', href: '/students' }]}
      aside={
        <Card title="Learner snapshot" eyebrow="Roster health">
          <MetricList
            items={[
              { label: 'Level', value: student.level || '—' },
              { label: 'Stage', value: student.stage || '—' },
              { label: 'Attendance', value: percent(student.attendanceRate) },
              { label: 'Pod', value: student.podLabel || 'Unassigned' },
            ]}
          />
        </Card>
      }
    >
      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Learner profile" eyebrow={student.cohortName || 'Learner'}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={student.level || 'Unknown'} tone="#EEF2FF" text="#3730A3" />
              <Pill label={student.stage || 'Unknown stage'} tone="#ECFDF5" text="#166534" />
            </div>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              Age: <strong>{student.age || '—'}</strong><br />
              Guardian: <strong>{student.guardianName || '—'}</strong><br />
              Device access: <strong>{student.deviceAccess || '—'}</strong><br />
              Mallam: <strong>{student.mallamName || 'Unassigned'}</strong>
            </div>
          </div>
        </Card>
        <LearnerMallamAssignmentForm student={student} mallams={mallams} returnPath={`/students/${student.id}`} />
      </section>

      <section style={{ ...responsiveGrid(340), marginBottom: 20 }}>
        <UpdateStudentForm student={student} cohorts={cohorts} pods={pods} mallams={mallams} />
        <DeleteStudentForm student={student} />
      </section>
    </PageShell>
  );
}
