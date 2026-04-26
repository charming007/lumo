import { notFound } from 'next/navigation';
import { DeleteMallamForm, UpdateMallamForm } from '../../../components/admin-forms';
import { MallamRosterManager } from '../../../components/mallam-roster-manager';
import { ModalLauncher } from '../../../components/modal-launcher';
import { fetchCenters, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudents } from '../../../lib/api';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../../lib/ui';

export default async function MallamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mallamsResult, centersResult, podsResult, studentsResult, statesResult, localGovernmentsResult] = await Promise.allSettled([
    fetchMallams(),
    fetchCenters(),
    fetchPods(),
    fetchStudents(),
    fetchStates(),
    fetchLocalGovernments(),
  ]);

  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const centers = centersResult.status === 'fulfilled' ? centersResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const states = statesResult.status === 'fulfilled' ? statesResult.value : [];
  const localGovernments = localGovernmentsResult.status === 'fulfilled' ? localGovernmentsResult.value : [];

  const failedSources = [
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    studentsResult.status === 'rejected' ? 'students' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];

  const mallam = mallams.find((item) => item.id === id);
  if (!mallam) notFound();

  const coveredPodIds = new Set(mallam.podIds || []);
  const assignedLearners = students.filter((student) => student.mallamId === mallam.id);
  const unassignedLearners = students.filter((student) => {
    if (student.mallamId === mallam.id) return false;
    if (!coveredPodIds.size) return !student.mallamId;
    return coveredPodIds.has(student.podId || '') && student.mallamId !== mallam.id;
  });

  return (
    <PageShell
      title={mallam.displayName || mallam.name}
      subtitle="Mallam admin detail for profile updates, roster control, and deletion."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Mallams', href: '/mallams' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <ModalLauncher
              buttonLabel="✏️ Edit mallam"
              title={`Edit ${mallam.displayName || mallam.name}`}
              description="Update mallam details from a focused popup instead of a giant inline form."
              eyebrow="Mallam admin"
              triggerStyle={{ borderRadius: 14, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', boxShadow: 'none' }}
            >
              <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel="🗑️ Delete mallam"
              title={`Delete ${mallam.displayName || mallam.name}`}
              description="Remove this mallam from the live roster carefully."
              eyebrow="Danger zone"
              triggerStyle={{ borderRadius: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', boxShadow: 'none' }}
            >
              <DeleteMallamForm mallam={mallam} />
            </ModalLauncher>
          </div>
          <Card title="Mallam snapshot" eyebrow="Coverage">
            <MetricList
              items={[
                { label: 'Learners', value: String(mallam.learnerCount || 0) },
                { label: 'Pods', value: String(mallam.podLabels?.length || 0) },
                { label: 'Status', value: mallam.status || '—' },
                { label: 'Center', value: mallam.centerName || '—' },
              ]}
            />
          </Card>
        </div>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          Mallam detail recovered with degraded feeds: {failedSources.join(', ')}. Core facilitator record is still loaded, but roster management and profile forms may have reduced geography or learner context until those feeds recover.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Mallam profile" eyebrow={mallam.role || 'Mallam'}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={mallam.status || 'Unknown'} tone="#ECFDF5" text="#166534" />
              <Pill label={mallam.certificationLevel || 'Certification pending'} tone="#EEF2FF" text="#3730A3" />
            </div>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              Languages: <strong>{(mallam.languages || []).join(', ') || '—'}</strong><br />
              Pods: <strong>{(mallam.podLabels || []).join(', ') || '—'}</strong><br />
              Region: <strong>{mallam.region || '—'}</strong>
            </div>
          </div>
        </Card>
        <MallamRosterManager
          mallam={mallam}
          roster={assignedLearners}
          candidateLearners={unassignedLearners}
          mallams={mallams}
          returnPath={`/mallams/${mallam.id}`}
        />
      </section>

    </PageShell>
  );
}
