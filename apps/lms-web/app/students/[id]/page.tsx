import { notFound } from 'next/navigation';
import { DeleteStudentForm, UpdateStudentForm } from '../../../components/admin-forms';
import { LearnerMallamAssignmentForm } from '../../../components/learner-mallam-assignment-form';
import { ModalLauncher } from '../../../components/modal-launcher';
import { fetchCenters, fetchCohorts, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudents } from '../../../lib/api';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../../lib/ui';

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [students, cohorts, pods, mallams, centers, states, localGovernments] = await Promise.all([
    fetchStudents(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
    fetchCenters(),
    fetchStates(),
    fetchLocalGovernments(),
  ]);

  const student = students.find((item) => item.id === id);
  if (!student) notFound();

  return (
    <PageShell
      title={student.name}
      subtitle="Learner admin detail for roster edits, pod routing, and deletion controls."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Students', href: '/students' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <ModalLauncher
              buttonLabel="✏️ Edit learner"
              title={`Edit ${student.name}`}
              description="Update learner details from a focused popup instead of a giant inline form."
              eyebrow="Learner admin"
              triggerStyle={{ borderRadius: 14, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', boxShadow: 'none' }}
            >
              <UpdateStudentForm student={student} cohorts={cohorts} pods={pods} mallams={mallams} centers={centers} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel="🗑️ Delete learner"
              title={`Delete ${student.name}`}
              description="Remove this learner from the live roster carefully."
              eyebrow="Danger zone"
              triggerStyle={{ borderRadius: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', boxShadow: 'none' }}
            >
              <DeleteStudentForm student={student} />
            </ModalLauncher>
          </div>
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
        </div>
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
              Mallam: <strong>{student.mallamName || 'Derived from pod once assigned'}</strong>
            </div>
          </div>
        </Card>
        <LearnerMallamAssignmentForm student={student} pods={pods} returnPath={`/students/${student.id}`} />
      </section>

    </PageShell>
  );
}
