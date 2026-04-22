import { notFound } from 'next/navigation';
import { DeleteMallamForm, UpdateMallamForm } from '../../../components/admin-forms';
import { MallamRosterManager } from '../../../components/mallam-roster-manager';
import { fetchCenters, fetchMallams, fetchPods, fetchStudents } from '../../../lib/api';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../../lib/ui';

export default async function MallamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mallams, centers, pods, students] = await Promise.all([
    fetchMallams(),
    fetchCenters(),
    fetchPods(),
    fetchStudents(),
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
        <MallamRosterManager mallam={mallam} assignedStudents={assignedLearners} candidateStudents={unassignedLearners} />
      </section>

      <section style={{ ...responsiveGrid(340), marginBottom: 20 }}>
        <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} />
        <DeleteMallamForm mallam={mallam} />
      </section>
    </PageShell>
  );
}
