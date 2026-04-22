import Link from 'next/link';
import { CreateMallamForm, DeleteMallamForm, UpdateMallamForm } from '../../components/admin-forms';
import { fetchCenters, fetchMallams, fetchPods } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

export default async function MallamsPage() {
  const [mallams, centers, pods] = await Promise.all([
    fetchMallams(),
    fetchCenters(),
    fetchPods(),
  ]);
  const active = mallams.filter((mallam) => (mallam.status || '').toLowerCase() === 'active');

  return (
    <PageShell
      title="Mallams"
      subtitle="Manage facilitator coverage, assigned pods, languages, and center distribution."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Mallam coverage" eyebrow="Live API">
          <MetricList
            items={[
              { label: 'Mallams', value: String(mallams.length) },
              { label: 'Active', value: String(active.length) },
              { label: 'Pods covered', value: String(new Set(mallams.flatMap((mallam) => mallam.podLabels || [])).size) },
            ]}
          />
        </Card>
      }
    >
      <section style={{ ...responsiveGrid(260), marginBottom: 20 }}>
        <CreateMallamForm centers={centers} pods={pods} />
        {mallams.slice(0, 2).map((mallam) => (
          <Card key={mallam.id} title={mallam.displayName || mallam.name} eyebrow={mallam.role || 'Mallam'}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={mallam.status || 'Unknown'} tone="#ECFDF5" text="#166534" />
                <Pill label={mallam.certificationLevel || 'Certification pending'} tone="#EEF2FF" text="#3730A3" />
              </div>
              <div style={{ color: '#475569', lineHeight: 1.6 }}>
                Learners: <strong>{mallam.learnerCount}</strong><br />
                Pods: <strong>{(mallam.podLabels || []).join(', ') || 'None'}</strong><br />
                Center: <strong>{mallam.centerName || 'Unknown'}</strong>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <SimpleTable
        columns={['Mallam', 'Status', 'Learners', 'Pods', 'Languages', 'Center', 'Actions']}
        rows={mallams.map((mallam) => [
          <div key={`${mallam.id}-name`}>
            <strong>{mallam.displayName || mallam.name}</strong>
            <div style={{ color: '#64748b', marginTop: 4 }}>{mallam.role || 'Mallam'} · {mallam.region || 'Unknown region'}</div>
          </div>,
          <Pill key={`${mallam.id}-status`} label={mallam.status || 'Unknown'} tone="#F8FAFC" text="#334155" />,
          String(mallam.learnerCount || 0),
          (mallam.podLabels || []).join(', ') || '—',
          (mallam.languages || []).join(', ') || '—',
          mallam.centerName || '—',
          <div key={`${mallam.id}-actions`} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href={`/mallams/${mallam.id}`} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>
                Open profile
              </Link>
              <Link href="/assignments" style={{ color: '#0f766e', fontWeight: 800, textDecoration: 'none' }}>
                Open assignments
              </Link>
            </div>
            <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} embedded />
            <DeleteMallamForm mallam={mallam} embedded />
          </div>,
        ])}
      />
    </PageShell>
  );
}
