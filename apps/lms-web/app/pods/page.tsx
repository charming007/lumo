import { fetchPods } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

function sectionAlert(message: string, tone: 'warning' | 'neutral' = 'neutral') {
  const palette = tone === 'warning'
    ? { background: '#fff7ed', border: '#fed7aa', text: '#9a3412' }
    : { background: '#f8fafc', border: '#e2e8f0', text: '#64748b' };

  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: palette.background, border: `1px solid ${palette.border}`, color: palette.text, lineHeight: 1.6 }}>
      {message}
    </div>
  );
}

export default async function PodsPage() {
  const podsResult = await fetchPods().then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const, value: [] }));
  const pods = podsResult.value;

  return (
    <PageShell title="Pods" subtitle="Deployment health, pod utilization, mallam coverage, and connectivity posture across live centers.">
      {!podsResult.ok ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Pod operations data is temporarily unavailable. The page stays reachable instead of blowing up.
        </div>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        {pods.length ? pods.map((pod) => {
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
        }) : (
          <div style={{ gridColumn: '1 / -1' }}>
            {sectionAlert(podsResult.ok ? 'No pods are available yet.' : 'Pod cards are unavailable because the API feed failed.', podsResult.ok ? 'neutral' : 'warning')}
          </div>
        )}
      </section>

      <SimpleTable
        columns={['Pod', 'Center', 'Region', 'Type', 'Connectivity', 'Learners', 'Mallams', 'Status']}
        rows={pods.length ? pods.map((pod) => [
          pod.label,
          pod.centerName,
          pod.region,
          pod.type,
          pod.connectivity,
          String(pod.learnersActive),
          pod.mallamNames?.join(', ') ?? '—',
          <Pill key={pod.id} label={pod.status} tone={pod.status === 'active' ? '#DCFCE7' : '#E0E7FF'} text={pod.status === 'active' ? '#166534' : '#3730A3'} />,
        ]) : [[sectionAlert(podsResult.ok ? 'No pod records exist yet.' : 'Pod table unavailable — the feed failed.', podsResult.ok ? 'neutral' : 'warning'), '', '', '', '', '', '', '']]}
      />
    </PageShell>
  );
}
