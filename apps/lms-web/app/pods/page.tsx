import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { fetchMallams, fetchPods, fetchStudents } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

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

function normalizeFilterValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  return values.filter(Boolean).join(' ').toLowerCase().includes(query);
}

function connectivityTone(connectivity: string) {
  if (connectivity === 'offline') return { tone: '#FEE2E2', text: '#B91C1C' };
  if (connectivity === 'spotty') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#DCFCE7', text: '#166534' };
}

function statusTone(status: string) {
  if (status === 'active') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'maintenance') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

export default async function PodsPage({ searchParams }: { searchParams?: Promise<{ message?: string; q?: string | string[]; region?: string | string[]; connectivity?: string | string[]; status?: string | string[]; type?: string | string[] }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Pods"
        subtitle="Production wiring is incomplete, so pod deployment coverage is blocked instead of pretending center health and learner capacity are live."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: pod operations API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} pod connectivity, utilization, mallam coverage, and center deployment health would degrade into convincingly wrong cards and tables. Fix the env var, redeploy, then verify live pod operations before treating capacity or connectivity as real.
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

  const query = await searchParams;
  const [podsResult, studentsResult, mallamsResult] = await Promise.allSettled([
    fetchPods(),
    fetchStudents(),
    fetchMallams(),
  ]);

  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const failedSources = [
    podsResult.status === 'rejected' ? 'pods' : null,
    studentsResult.status === 'rejected' ? 'learners' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
  ].filter(Boolean);

  const searchText = normalizeFilterValue(query?.q).trim().toLowerCase();
  const regionFilter = normalizeFilterValue(query?.region).trim();
  const connectivityFilter = normalizeFilterValue(query?.connectivity).trim();
  const statusFilter = normalizeFilterValue(query?.status).trim();
  const typeFilter = normalizeFilterValue(query?.type).trim();

  const regionOptions = Array.from(new Set(pods.map((pod) => pod.region).filter(Boolean))).sort();
  const typeOptions = Array.from(new Set(pods.map((pod) => pod.type).filter(Boolean))).sort();

  const filteredPods = pods.filter((pod) => {
    const regionMatches = !regionFilter || pod.region === regionFilter;
    const connectivityMatches = !connectivityFilter || pod.connectivity === connectivityFilter;
    const statusMatches = !statusFilter || pod.status === statusFilter;
    const typeMatches = !typeFilter || pod.type === typeFilter;
    const podStudents = students.filter((student) => student.podId === pod.id || student.podLabel === pod.label);
    const podMallams = mallams.filter((mallam) => (mallam.podIds ?? []).includes(pod.id) || mallam.podLabels.includes(pod.label));
    const queryMatches = matchesQuery([
      pod.label,
      pod.centerName,
      pod.region,
      pod.type,
      pod.connectivity,
      pod.status,
      pod.mallamNames?.join(' '),
      podStudents.map((student) => student.name).join(' '),
      podMallams.map((mallam) => mallam.displayName).join(' '),
    ], searchText);
    return regionMatches && connectivityMatches && statusMatches && typeMatches && queryMatches;
  });

  const filtersActive = Boolean(searchText || regionFilter || connectivityFilter || statusFilter || typeFilter);

  const podOps = filteredPods.map((pod) => {
    const roster = students.filter((student) => student.podId === pod.id || student.podLabel === pod.label);
    const mappedMallams = mallams.filter((mallam) => (mallam.podIds ?? []).includes(pod.id) || mallam.podLabels.includes(pod.label));
    const atRiskLearners = roster.filter((student) => student.attendanceRate < 0.85);
    const avgAttendance = roster.length ? roster.reduce((sum, student) => sum + student.attendanceRate, 0) / roster.length : 0;
    const utilization = pod.capacity ? Math.round((pod.learnersActive / pod.capacity) * 100) : null;
    const capacityGap = pod.capacity ? Math.max(pod.capacity - pod.learnersActive, 0) : null;
    const trainingMallams = mappedMallams.filter((mallam) => mallam.status === 'training').length;
    const pressureScore =
      (pod.connectivity === 'offline' ? 5 : pod.connectivity === 'spotty' ? 3 : 0)
      + (utilization !== null ? (utilization >= 95 ? 4 : utilization >= 80 ? 2 : 0) : 0)
      + (atRiskLearners.length >= 4 ? 3 : atRiskLearners.length >= 2 ? 2 : atRiskLearners.length >= 1 ? 1 : 0)
      + (trainingMallams > 0 ? 1 : 0)
      + (pod.status !== 'active' ? 1 : 0);

    return {
      pod,
      roster,
      mappedMallams,
      atRiskLearners,
      avgAttendance,
      utilization,
      capacityGap,
      trainingMallams,
      pressureScore,
    };
  });

  const pressureQueue = podOps
    .filter((entry) => entry.pressureScore > 0)
    .sort((left, right) => (right.pressureScore - left.pressureScore) || ((right.utilization ?? -1) - (left.utilization ?? -1)) || (left.avgAttendance - right.avgAttendance))
    .slice(0, 5);

  const activePods = podOps.filter((entry) => entry.pod.status === 'active').length;
  const offlinePods = podOps.filter((entry) => entry.pod.connectivity === 'offline').length;
  const spottyPods = podOps.filter((entry) => entry.pod.connectivity === 'spotty').length;
  const highUtilizationPods = podOps.filter((entry) => (entry.utilization ?? 0) >= 80).length;
  const learnerCoverage = podOps.reduce((sum, entry) => sum + entry.roster.length, 0);
  const atRiskCoverage = podOps.reduce((sum, entry) => sum + entry.atRiskLearners.length, 0);
  const averageUtilization = podOps.filter((entry) => entry.utilization !== null).length
    ? Math.round(podOps.filter((entry) => entry.utilization !== null).reduce((sum, entry) => sum + (entry.utilization ?? 0), 0) / podOps.filter((entry) => entry.utilization !== null).length)
    : 0;

  return (
    <PageShell
      title="Pods"
      subtitle="Pod operations with actual deployment triage: filter the footprint, spot connectivity trouble, and catch overloaded delivery lanes before the field team feels it first."
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href="/mallams" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open mallam ops
          </a>
          <a href="/reports" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#F5F3FF', color: '#6D28D9', textDecoration: 'none' }}>
            Open reports
          </a>
        </div>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Pod operations are running in degraded mode: {failedSources.join(', ')} data {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <Card title="Pod filters" eyebrow="Scope by region, status, connectivity, and type before you start celebrating fake spare capacity">
          <form style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...responsiveGrid(220), gap: 12 }}>
              <input name="q" defaultValue={searchText} placeholder="Search pod, center, mallam, or learner" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
              <select name="region" defaultValue={regionFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All regions</option>
                {regionOptions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
              <select name="connectivity" defaultValue={connectivityFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All connectivity states</option>
                <option value="online">Online</option>
                <option value="spotty">Spotty</option>
                <option value="offline">Offline</option>
              </select>
              <select name="status" defaultValue={statusFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
              <select name="type" defaultValue={typeFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All pod types</option>
                {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}>Apply filters</button>
              <a href="/pods" style={{ borderRadius: 12, padding: '12px 16px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>Clear filters</a>
            </div>
          </form>
        </Card>
      </section>

      {filtersActive ? (
        <div style={{ marginBottom: 16, color: '#475569', fontWeight: 700 }}>
          Showing {filteredPods.length} pod{filteredPods.length === 1 ? '' : 's'} in the current scope.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Deployment posture" eyebrow="Footprint health">
          <MetricList
            items={[
              { label: 'Pods in scope', value: String(filteredPods.length) },
              { label: 'Active pods', value: String(activePods) },
              { label: 'Average utilization', value: podOps.length ? `${averageUtilization}%` : '—' },
              { label: 'Learners in scope', value: String(learnerCoverage) },
            ]}
          />
        </Card>
        <Card title="Risk posture" eyebrow="What is going wrong first">
          <MetricList
            items={[
              { label: 'Offline pods', value: String(offlinePods) },
              { label: 'Spotty pods', value: String(spottyPods) },
              { label: 'High utilization pods', value: String(highUtilizationPods) },
              { label: 'At-risk learners here', value: String(atRiskCoverage) },
            ]}
          />
        </Card>
        <Card title="Operator reading" eyebrow="What to notice before the excuses start">
          <div style={{ display: 'grid', gap: 10, color: '#64748b', lineHeight: 1.6 }}>
            <div>Offline pods are not a minor nuisance. They break delivery rhythm, sync trust, and reporting confidence in one move.</div>
            <div>High utilization plus weak attendance usually means the lane is overloaded, not magically efficient.</div>
            <div>If a pod only looks healthy because mallam coverage is thin or learner feeds failed, that is demo theatre, not ops reality.</div>
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginBottom: 20 }}>
        <Card title="Pressure queue" eyebrow="Which pods need intervention first">
          <div style={{ display: 'grid', gap: 12 }}>
            {pressureQueue.length ? pressureQueue.map(({ pod, utilization, roster, mappedMallams, atRiskLearners, avgAttendance, capacityGap, trainingMallams, pressureScore }) => {
              const connectivity = connectivityTone(pod.connectivity);
              return (
                <div key={pod.id} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ color: '#0f172a' }}>{pod.label}</strong>
                    <Pill label={`Pressure ${pressureScore}`} tone={pressureScore >= 7 ? '#FEE2E2' : '#FEF3C7'} text={pressureScore >= 7 ? '#B91C1C' : '#92400E'} />
                  </div>
                  <div style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>
                    {pod.centerName} • {pod.region} • {pod.type}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <Pill label={pod.connectivity} tone={connectivity.tone} text={connectivity.text} />
                    <Pill label={pod.status} tone={statusTone(pod.status).tone} text={statusTone(pod.status).text} />
                    {utilization !== null ? <Pill label={`${utilization}% utilized`} tone={utilization >= 95 ? '#FEE2E2' : utilization >= 80 ? '#FEF3C7' : '#DCFCE7'} text={utilization >= 95 ? '#B91C1C' : utilization >= 80 ? '#92400E' : '#166534'} /> : null}
                  </div>
                  <div style={{ ...responsiveGrid(140), color: '#334155' }}>
                    <div><strong>{roster.length}</strong><div style={{ color: '#64748b' }}>Learners mapped</div></div>
                    <div><strong>{mappedMallams.length}</strong><div style={{ color: '#64748b' }}>Mallams mapped</div></div>
                    <div><strong>{atRiskLearners.length}</strong><div style={{ color: '#64748b' }}>At-risk learners</div></div>
                    <div><strong>{Math.round(avgAttendance * 100)}%</strong><div style={{ color: '#64748b' }}>Avg attendance</div></div>
                    <div><strong>{capacityGap === null ? '—' : capacityGap}</strong><div style={{ color: '#64748b' }}>Capacity left</div></div>
                    <div><strong>{trainingMallams}</strong><div style={{ color: '#64748b' }}>Training mallams</div></div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                No pressure queue in the current scope.
              </div>
            )}
          </div>
        </Card>

        <Card title="How pressure is ranked" eyebrow="Quick operator logic">
          <div style={{ display: 'grid', gap: 12, color: '#64748b', lineHeight: 1.6 }}>
            <div>Connectivity trouble hits hardest because an offline pod can look calm while delivery is already broken.</div>
            <div>High utilization adds risk because full pods leave no margin when attendance slips or staffing changes.</div>
            <div>At-risk learners and training mallams add weight so fragile delivery lanes surface before they become donor-facing problems.</div>
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <Card title="Pod roster" eyebrow="Profile-first ops view">
          <div style={{ display: 'grid', gap: 14 }}>
            {podOps.length ? podOps.map(({ pod, roster, mappedMallams, atRiskLearners, avgAttendance, utilization, capacityGap }) => {
              const connectivity = connectivityTone(pod.connectivity);
              const status = statusTone(pod.status);
              return (
                <div key={pod.id} style={{ padding: 18, borderRadius: 18, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{pod.label}</strong>
                      <div style={{ color: '#64748b', marginTop: 4 }}>{pod.centerName} • {pod.region} • {pod.type}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Pill label={pod.connectivity} tone={connectivity.tone} text={connectivity.text} />
                      <Pill label={pod.status} tone={status.tone} text={status.text} />
                    </div>
                  </div>
                  <div style={{ ...responsiveGrid(180), color: '#334155', marginBottom: 14 }}>
                    <div><strong>{roster.length}</strong><div style={{ color: '#64748b' }}>Learners mapped</div></div>
                    <div><strong>{mappedMallams.length}</strong><div style={{ color: '#64748b' }}>Mallams mapped</div></div>
                    <div><strong>{Math.round(avgAttendance * 100)}%</strong><div style={{ color: '#64748b' }}>Avg attendance</div></div>
                    <div><strong>{atRiskLearners.length}</strong><div style={{ color: '#64748b' }}>Learners below 85%</div></div>
                    <div><strong>{utilization === null ? '—' : `${utilization}%`}</strong><div style={{ color: '#64748b' }}>Utilization</div></div>
                    <div><strong>{capacityGap === null ? '—' : capacityGap}</strong><div style={{ color: '#64748b' }}>Capacity remaining</div></div>
                  </div>
                  <div style={{ display: 'grid', gap: 8, color: '#475569', lineHeight: 1.6 }}>
                    <div><strong>Mallam coverage:</strong> {mappedMallams.length ? mappedMallams.map((mallam) => mallam.displayName).join(', ') : (pod.mallamNames?.join(', ') ?? 'No mallam mapped yet')}</div>
                    <div><strong>Operator note:</strong> {pod.connectivity === 'offline'
                      ? 'Connectivity is broken. Treat this pod as intervention-first, not “check later.”'
                      : utilization !== null && utilization >= 95
                        ? 'This pod is basically full. Rebalance before one absence turns into delivery chaos.'
                        : atRiskLearners.length >= 3
                          ? 'Attendance pressure is already visible here. Coaching follow-up beats polite denial.'
                          : 'This pod looks stable enough for normal monitoring right now.'}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div>
                {sectionAlert(podsResult.status === 'fulfilled' ? (filtersActive ? 'No pods match the current filters.' : 'No pods are available yet.') : 'Pod cards are unavailable because the API feed failed.', podsResult.status === 'fulfilled' ? 'neutral' : 'warning')}
              </div>
            )}
          </div>
        </Card>
      </section>

      <SimpleTable
        columns={['Pod', 'Center', 'Region', 'Type', 'Connectivity', 'Status', 'Learners', 'Mallams', 'Utilization', 'At risk']}
        rows={podOps.length ? podOps.map(({ pod, roster, mappedMallams, atRiskLearners, utilization }) => [
          <strong key={pod.id}>{pod.label}</strong>,
          pod.centerName,
          pod.region,
          pod.type,
          <Pill key={`${pod.id}-connectivity`} label={pod.connectivity} tone={connectivityTone(pod.connectivity).tone} text={connectivityTone(pod.connectivity).text} />,
          <Pill key={`${pod.id}-status`} label={pod.status} tone={statusTone(pod.status).tone} text={statusTone(pod.status).text} />,
          String(roster.length || pod.learnersActive),
          mappedMallams.length ? mappedMallams.map((mallam) => mallam.displayName).join(', ') : (pod.mallamNames?.join(', ') ?? '—'),
          utilization === null ? '—' : `${utilization}%`,
          String(atRiskLearners.length),
        ]) : [[sectionAlert(podsResult.status === 'fulfilled' ? (filtersActive ? 'No pod rows match the current filters.' : 'No pod records exist yet.') : 'Pod table unavailable — the feed failed.', podsResult.status === 'fulfilled' ? 'neutral' : 'warning'), '', '', '', '', '', '', '', '', '']]}
      />
    </PageShell>
  );
}
