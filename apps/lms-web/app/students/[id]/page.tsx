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
  const [studentsResult, cohortsResult, podsResult, mallamsResult, centersResult, statesResult, localGovernmentsResult] = await Promise.allSettled([
    fetchStudents(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
    fetchCenters(),
    fetchStates(),
    fetchLocalGovernments(),
  ]);

  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const centers = centersResult.status === 'fulfilled' ? centersResult.value : [];
  const states = statesResult.status === 'fulfilled' ? statesResult.value : [];
  const localGovernments = localGovernmentsResult.status === 'fulfilled' ? localGovernmentsResult.value : [];

  const failedSources = [
    studentsResult.status === 'rejected' ? 'students' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];

  const student = students.find((item) => item.id === id);
  if (!student) notFound();

  return (
    <PageShell
      title={student.name}
      subtitle="Learner admin detail for roster edits, mallam assignment, and deletion controls."
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
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          Learner detail recovered with degraded feeds: {failedSources.join(', ')}. Core learner record is still loaded, but edit forms and assignment selectors may have reduced geography or roster context until those feeds recover.
        </div>
      ) : null}

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

    </PageShell>
  );
}
