import { fetchPods } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

export default async function PodsPage() {
  const pods = await fetchPods();

  return (
    <PageShell title="Pods" subtitle="Deployment health, pod utilization, mallam coverage, and connectivity posture across live centers.">
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        {pods.map((pod) => {
          const utilization = pod.capacity ? Math.round((pod.learnersActive / pod.capacity) * 100) : null;
          return (
            <Card key={pod.id} title={pod.label} eyebrow={pod.centerName}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div><strong>Region:</strong> {pod.region}</div>
                <div><strong>Type:</strong> {pod.type}</div>
                <div><strong>Connectivity:</strong> {pod.connectivity}</div>
                <div><strong>Utilization:</strong> {utilization ? `${utilization}% of capacity` : `${pod.learnersActive} active learners`}</div>
                <div><strong>Mallams:</strong> {pod.mallamNames?.join(', ') ?? '—'}</div>
                <div><strong>Status:</strong> <Pill label={pod.status} tone={pod.status === 'active' ? '#DCFCE7' : '#E0E7FF'} text={pod.status === 'active' ? '#166534' : '#3730A3'} /></div>
              </div>
            </Card>
          );
        })}
      </section>

      <SimpleTable
        columns={['Pod', 'Center', 'Region', 'Type', 'Connectivity', 'Learners', 'Mallams', 'Status']}
        rows={pods.map((pod) => [
          pod.label,
          pod.centerName,
          pod.region,
          pod.type,
          pod.connectivity,
          String(pod.learnersActive),
          pod.mallamNames?.join(', ') ?? '—',
          <Pill key={pod.id} label={pod.status} tone={pod.status === 'active' ? '#DCFCE7' : '#E0E7FF'} text={pod.status === 'active' ? '#166534' : '#3730A3'} />,
        ])}
      />
    </PageShell>
  );
}
