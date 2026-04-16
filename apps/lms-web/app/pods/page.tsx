import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { fetchPods } from '../../lib/api';
import { API_BASE_SOURCE } from '../../lib/config';
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
  if (API_BASE_SOURCE === 'missing-production-env') {
    return (
      <DeploymentBlockerCard
        title="Pods"
        subtitle="Production wiring is incomplete, so pod deployment coverage is blocked instead of pretending center health and learner capacity are live."
        blockerHeadline="Deployment blocker: pod operations API base URL is missing."
        blockerDetail={(
          <>
            This production build does not have <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code>, so pod connectivity, utilization, mallam coverage, and center deployment health would degrade into convincingly wrong cards and tables. Fix the env var, redeploy, then verify live pod operations before treating capacity or connectivity as real.
          </>
        )}
        whyBlocked={[
          'Pods are operational coverage, not decorative metadata. Capacity, connectivity, and mallam assignment decisions all depend on live backend state.',
          'Without the production API base, this page could imply open capacity or healthy connectivity while the backend is actually unreachable.',
          'Blocking here prevents deployment reviewers from approving a fake-green infrastructure view.',
        ]}
        verificationItems={[
          {
            surface: 'Pod cards',
            expected: 'Live pods load with center, region, connectivity, utilization, and mallam coverage data',
            failure: 'Cards render but capacity and connectivity are placeholder-safe fiction',
          },
          {
            surface: 'Utilization table',
            expected: 'Learner counts and status rows match the live operations feed',
            failure: 'Empty or calm-looking utilization rows appear because the API never connected',
          },
          {
            surface: 'Cross-check with mallams',
            expected: 'Pod coverage matches live mallam assignments on the mallam roster',
            failure: 'Pods and mallams disagree because one or both surfaces are running on dead data',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Mallam blocker', href: '/mallams', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Reports blocker', href: '/reports', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

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
