import Link from 'next/link';
import { fetchPods } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

export default async function PodsPage() {
  const pods = await fetchPods();
  const activePods = pods.filter((pod) => (pod.status || '').toLowerCase() === 'active');

  return (
    <PageShell
      title="Pods"
      subtitle="Monitor pod composition, mallam assignment, and learner throughput without bouncing into Assignments."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Pod snapshot" eyebrow="Live API">
          <MetricList
            items={[
              { label: 'Pods', value: String(pods.length) },
              { label: 'Active', value: String(activePods.length) },
              { label: 'Avg learners', value: pods.length ? String(Math.round(pods.reduce((sum, pod) => sum + (pod.learnersActive || 0), 0) / pods.length)) : '0' },
            ]}
          />
        </Card>
      }
    >
      <section style={{ ...responsiveGrid(260), marginBottom: 20 }}>
        {pods.slice(0, 3).map((pod) => (
          <Card key={pod.id} title={pod.label || pod.id} eyebrow={pod.status || 'Pod'}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={`${pod.learnersActive || 0} learners`} tone="#EEF2FF" text="#3730A3" />
                <Pill label={(pod.mallamNames || []).join(', ') || 'No mallam'} tone="#ECFDF5" text="#166534" />
              </div>
              <div style={{ color: '#475569', lineHeight: 1.6 }}>
                Type: <strong>{pod.type || 'Unknown'}</strong><br />
                Center: <strong>{pod.centerName || 'Unknown'}</strong>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <SimpleTable
        columns={['Pod', 'Status', 'Learners', 'Mallams', 'Type', 'Center', 'Actions']}
        rows={pods.map((pod) => [
          pod.label || pod.id,
          <Pill key={`${pod.id}-status`} label={pod.status || 'Unknown'} tone="#F8FAFC" text="#334155" />,
          String(pod.learnersActive || 0),
          (pod.mallamNames || []).join(', ') || '—',
          pod.type || '—',
          pod.centerName || '—',
          <Link key={`${pod.id}-link`} href="/assignments" style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>
            Open assignments
          </Link>,
        ])}
      />
    </PageShell>
  );
}
