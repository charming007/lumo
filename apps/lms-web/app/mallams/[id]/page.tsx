import { notFound } from 'next/navigation';
import { DeleteMallamForm, UpdateMallamForm } from '../../../components/admin-forms';
import { MallamRosterManager } from '../../../components/mallam-roster-manager';
import { ModalLauncher } from '../../../components/modal-launcher';
import { fetchCenters, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudents } from '../../../lib/api';
import { mallamGeographyLabel } from '../../../lib/geography';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../../lib/ui';

export default async function MallamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mallams, centers, pods, students, states, localGovernments] = await Promise.all([
    fetchMallams(),
    fetchCenters(),
    fetchPods(),
    fetchStudents(),
    fetchStates(),
    fetchLocalGovernments(),
  ]);

  const mallam = mallams.find((item) => item.id === id);
  if (!mallam) notFound();

  const assignedLearners = students.filter((student) => student.mallamId === mallam.id);
  const unassignedLearners = students.filter((student) => !student.mallamId || student.mallamId !== mallam.id);

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
                { label: 'Geography', value: mallamGeographyLabel(mallam, centers, states, localGovernments) },
              ]}
            />
          </Card>
        </div>
      }
    >
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
