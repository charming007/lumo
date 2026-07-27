import Link from 'next/link';
import { CreateMallamForm, DeleteMallamForm, UpdateMallamForm } from '../../components/admin-forms';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { GeographyFilterBar } from '../../components/geography-filter-bar';
import { ModalLauncher } from '../../components/modal-launcher';
import { AdminDirectory } from '../../components/admin-directory';
import { fetchCenters, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudents } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { filterMallamsByGeography, mallamGeographyLabel } from '../../lib/geography';
import { Card, MetricList, PageShell, Pill } from '../../lib/ui';

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'M';
}

function trainingPercent(certification?: string | null, status?: string | null) {
  const cert = String(certification || '').toLowerCase();
  const normalizedStatus = String(status || '').toLowerCase();
  if (cert.includes('2') || cert.includes('certified') || normalizedStatus === 'active') return 100;
  if (normalizedStatus === 'training') return 65;
  if (normalizedStatus === 'leave') return 35;
  return 45;
}

function statusTone(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return ['#DCFCE7', '#166534'] as const;
  if (normalized === 'training') return ['#FEF3C7', '#92400E'] as const;
  return ['#F1F5F9', '#475569'] as const;
}

export default async function MallamsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Mallams"
        subtitle="Facilitator roster control is blocked until the LMS is wired to a real production API, because fake-empty staffing screens are operationally toxic."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: mallams API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} the facilitator roster cannot be trusted for pod ownership, staffing coverage, or learner routing. Fix the env var, redeploy, then verify live mallam data.
          </>
        )}
        whyBlocked={[
          'Mallams is a live staffing surface, not decorative reporting. It controls who owns pods, who carries learners, and who is even active in the field.',
          'If production is pointed at localhost, a placeholder host, or no real backend, a calm-looking empty roster becomes a lie with deployment consequences.',
        ]}
        verificationItems={[
          {
            surface: 'Mallam roster',
            expected: 'Live facilitator rows, statuses, geography, and pod coverage load from the backend',
            failure: 'Table looks clean only because the LMS never connected to the real API',
          },
          {
            surface: 'Add / edit mallam flows',
            expected: 'Center, pod, state, and local government selectors load and submit against the live backend',
            failure: 'Forms open with dead selectors, stale references, or writes that go nowhere',
          },
          {
            surface: 'Roster ownership',
            expected: 'Primary pod ownership and mallam coverage still match the live deployment footprint after save',
            failure: 'Operators think facilitator coverage changed when the deployment was disconnected the whole time',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Pods', href: '/pods', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const stateId = typeof query?.stateId === 'string' ? query.stateId : '';
  const localGovernmentId = typeof query?.localGovernmentId === 'string' ? query.localGovernmentId : '';
  const podId = typeof query?.podId === 'string' ? query.podId : '';

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
  const criticalMallamFailures = [
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];

  const hasCoreRosterGap = mallamsResult.status === 'rejected';
  const geographyFilterDegraded = statesResult.status === 'rejected' || localGovernmentsResult.status === 'rejected';

  if (criticalMallamFailures.length) {
    const blockerDetail = criticalMallamFailures.length === 1
      ? `The ${criticalMallamFailures[0]} feed failed to load from the live API. Leaving facilitator create, edit, or pod-coverage controls up would let operators rewrite mallam ownership while the staffing graph is blind.`
      : `The ${criticalMallamFailures.join(', ')} feeds failed to load from the live API. Leaving facilitator create, edit, or pod-coverage controls up would let operators rewrite mallam ownership while the staffing graph is blind.`;

    return (
      <DeploymentBlockerCard
        title="Mallams"
        subtitle="Facilitator admin is a live staffing control surface, not a decorative directory. If the core staffing feeds are down, the route should block instead of inviting blind writes."
        blockerHeadline="Deployment blocker: mallam staffing feeds are degraded."
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length > criticalMallamFailures.length
              ? `Additional degraded feed${failedSources.length - criticalMallamFailures.length === 1 ? '' : 's'}: ${failedSources.filter((source) => !criticalMallamFailures.includes(source)).join(', ')}.`
              : ''}
          </>
        )}
        whyBlocked={[
          'Operators use this route to create facilitators, reassign primary pod ownership, and maintain live staffing coverage. If mallams, centers, pods, states, or local governments disappear, a polished UI becomes dangerous fiction fast.',
          'Learner counts can degrade separately as supporting context, but the staffing roster and write paths should stop cold when the core facilitator-reference graph is missing.',
        ]}
        verificationItems={[
          {
            surface: 'Facilitator roster + ownership graph',
            expected: 'Live mallams, centers, pods, states, and local governments all load before operators trust staffing admin',
            failure: 'Add, edit, delete, or roster actions remain reachable while the core facilitator-reference graph is missing or stale',
          },
          {
            surface: 'Profile and coverage forms',
            expected: 'Center, state, local government, and pod references load from the live backend before a facilitator write is allowed',
            failure: 'Forms stay interactive while the core staffing references are missing or stale',
          },
          {
            surface: 'Route trustworthiness',
            expected: 'Deployment review sees a blocker card until the core staffing feeds recover',
            failure: 'The route implies facilitator operations are safe when the staffing control surface is blind',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Pods', href: '/pods', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const filteredMallams = filterMallamsByGeography(mallams, centers, { stateId, localGovernmentId, podId });
  const active = filteredMallams.filter((mallam) => (mallam.status || '').toLowerCase() === 'active');
  const podCoverageCount = new Set(mallams.flatMap((mallam) => mallam.podLabels || [])).size;
  const primaryPodCoverageCount = new Set(filteredMallams.map((mallam) => mallam.podLabels?.[0]).filter(Boolean)).size;

  return (
    <PageShell
      title="Mallams"
      subtitle="Manage facilitator profiles with primary pod assignment as the main operational workflow."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ModalLauncher
              buttonLabel="Add mallam"
              title="Add mallam"
              description="Create a mallam profile, then attach it to the primary pod they will actually own or support."
              eyebrow="Mallam admin"
              disabled={hasCoreRosterGap}
            >
              <CreateMallamForm centers={centers} pods={pods} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
          </div>
          <Card title="Mallam coverage" eyebrow="Live API">
            <MetricList
              items={[
                { label: 'Mallams', value: String(filteredMallams.length) },
                { label: 'Active', value: String(active.length) },
                { label: 'Primary pods covered', value: String(primaryPodCoverageCount) },
                { label: 'Pods covered', value: String(podCoverageCount) },
              ]}
            />
          </Card>
        </div>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: hasCoreRosterGap ? '#fef2f2' : '#fff7ed', border: `1px solid ${hasCoreRosterGap ? '#fecaca' : '#fed7aa'}`, color: hasCoreRosterGap ? '#b91c1c' : '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          {hasCoreRosterGap
            ? `Mallam admin is degraded because the ${failedSources.join(', ')} feed${failedSources.length === 1 ? ' has' : 's have'} failed. The page stays visible so operators get an honest outage surface instead of a crash, but mallam profile and roster writes are not trustworthy until the mallams feed recovers.`
            : `Mallam admin recovered with degraded feeds: ${failedSources.join(', ')}. Core mallam actions stay live, but geography coverage and supporting labels may be incomplete until those feeds recover.`}
        </div>
      ) : null}

      <GeographyFilterBar
        resetHref="/mallams"
        fields={[
          { name: 'stateId', label: 'State', value: stateId, options: states.map((state) => ({ value: state.id, label: state.name })) },
          { name: 'localGovernmentId', label: 'Local government', value: localGovernmentId, options: localGovernments.filter((item) => !stateId || item.stateId === stateId).map((item) => ({ value: item.id, label: item.name })) },
          { name: 'podId', label: 'Pod', value: podId, options: pods.map((pod) => ({ value: pod.id, label: pod.label })) },
        ]}
        helper={hasCoreRosterGap
          ? 'Mallam roster feed is unavailable, so this page is showing an outage-safe shell instead of pretending facilitator coverage is empty.'
          : geographyFilterDegraded
            ? `Showing ${filteredMallams.length} mallam profile${filteredMallams.length === 1 ? '' : 's'} with degraded geography context because one of the region feeds is down.`
            : `Showing ${filteredMallams.length} mallam profile${filteredMallams.length === 1 ? '' : 's'} in the selected geography slice.`}
      />
      <AdminDirectory
        title="All mallams"
        count={filteredMallams.length}
        searchPlaceholder="Search mallams..."
      >
        {hasCoreRosterGap ? (
          <div style={{ color: '#b91c1c', lineHeight: 1.6 }}>Mallam roster unavailable. Recover the mallams feed before using facilitator admin actions.</div>
        ) : (
          <>
            <div data-directory-view="grid">
              {filteredMallams.map((mallam) => {
                const name = mallam.displayName || mallam.name;
                const training = trainingPercent(mallam.certificationLevel, mallam.status);
                const [tone, text] = statusTone(mallam.status);
                const search = [name, mallam.status, mallam.role, mallam.region, mallam.centerName, mallamGeographyLabel(mallam, centers, states, localGovernments), ...(mallam.podLabels || []), ...(mallam.languages || [])].filter(Boolean).join(' ');
                const actions = (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <Link href={`/mallams/${mallam.id}`} title="View mallam profile" aria-label="View mallam profile" style={{ textDecoration: 'none', color: '#202436', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900 }}>View</Link>
                    <ModalLauncher buttonLabel={<span aria-hidden="true">Edit</span>} title={`Edit ${name}`} description="Update mallam details without stretching the roster layout." eyebrow="Mallam admin" triggerStyle={{ borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', minWidth: 50, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: '0 10px', fontSize: 13 }}>
                      <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} states={states} localGovernments={localGovernments} />
                    </ModalLauncher>
                    <ModalLauncher buttonLabel={<span aria-hidden="true">Roster</span>} title={`Manage roster for ${name}`} description="Open the full profile path for deeper roster controls." eyebrow="Roster control" triggerStyle={{ borderRadius: 10, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#166534', minWidth: 62, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: '0 10px', fontSize: 13 }}>
                      <div style={{ display: 'grid', gap: 16 }}>
                        <Card title="Mallam roster manager" eyebrow="Roster control">
                          <div style={{ color: '#475569', lineHeight: 1.6 }}>Use the mallam profile for the full roster surface. This quick action stays lightweight here so pod-first routing still happens in one focused place.</div>
                        </Card>
                        <Link href={`/mallams/${mallam.id}`} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>Open full roster manager</Link>
                      </div>
                    </ModalLauncher>
                    <ModalLauncher buttonLabel={<span aria-hidden="true">Remove</span>} title={`Delete ${name}`} description="Remove this mallam from the live roster carefully." eyebrow="Danger zone" triggerStyle={{ borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', minWidth: 70, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: '0 10px', fontSize: 13 }}>
                      <DeleteMallamForm mallam={mallam} />
                    </ModalLauncher>
                  </div>
                );

                return (
                  <article key={mallam.id} data-directory-item data-search={search} style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, border: '1px solid #e4e8ef', background: 'linear-gradient(135deg, #ffffff 0%, #f9fbff 100%)', padding: 22, display: 'grid', gap: 18, boxShadow: '0 18px 45px rgba(76, 83, 112, 0.06)' }}>
                    <div aria-hidden="true" style={{ position: 'absolute', inset: '0 0 auto 0', height: 5, background: 'linear-gradient(90deg, #6D5DF7, #FF79C8, #9EE7F2)' }} />
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 58, height: 58, borderRadius: 999, background: '#E5E7EB', color: '#202436', display: 'grid', placeItems: 'center', fontWeight: 850, fontSize: 20, flex: '0 0 auto' }}>{initials(name)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 20, color: '#151827' }}>{name}</h3>
                        <div style={{ color: '#7b8496', marginTop: 4 }}>{mallam.role || 'Mallam'} · {mallam.region || 'Unknown region'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {[['Learners', String(mallam.learnerCount || 0)], ['Pods', String(mallam.podLabels?.length || 0)], ['Primary pod', mallam.podLabels?.[0] || '—']].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#7b8496' }}><span>{label}:</span><strong style={{ color: '#202436' }}>{value}</strong></div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7b8496' }}><span>Training</span><strong style={{ color: '#202436' }}>{training}%</strong></div>
                      <div style={{ height: 9, borderRadius: 999, background: '#dbe7f5', overflow: 'hidden' }}><div style={{ width: `${training}%`, height: '100%', borderRadius: 999, background: '#0B73D9' }} /></div>
                    </div>
                    <div style={{ height: 1, background: '#edf0f6' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <Pill label={mallam.status || 'Unknown'} tone={tone} text={text} />
                      {actions}
                    </div>
                  </article>
                );
              })}
            </div>
            <div data-directory-view="list">
              {filteredMallams.map((mallam) => {
                const name = mallam.displayName || mallam.name;
                const [tone, text] = statusTone(mallam.status);
                const search = [name, mallam.status, mallam.role, mallam.centerName, mallamGeographyLabel(mallam, centers, states, localGovernments), ...(mallam.podLabels || [])].filter(Boolean).join(' ');
                return (
                  <div key={mallam.id} data-directory-item data-search={search} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.3fr) 120px 90px 90px minmax(150px, 0.9fr) minmax(260px, 1.1fr)', gap: 16, alignItems: 'center', padding: '16px 18px', borderRadius: 18, border: '1px solid #edf0f6', background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span style={{ width: 44, height: 44, borderRadius: 999, background: '#E5E7EB', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{initials(name)}</span><strong>{name}</strong></div>
                    <Pill label={mallam.status || 'Unknown'} tone={tone} text={text} />
                    <div>{mallam.learnerCount || 0} learners</div>
                    <div>{mallam.podLabels?.length || 0} pods</div>
                    <div>{mallam.podLabels?.[0] || 'No primary pod'}</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Link href={`/mallams/${mallam.id}`} title="View mallam profile" aria-label="View mallam profile" style={{ textDecoration: 'none', color: '#202436', width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900 }}>View</Link>
                      <ModalLauncher buttonLabel={<span aria-hidden="true">Edit</span>} title={`Edit ${name}`} description="Update mallam details without stretching the roster layout." eyebrow="Mallam admin" triggerStyle={{ borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', minWidth: 50, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: '0 10px', fontSize: 13 }}>
                        <UpdateMallamForm mallam={mallam} centers={centers} pods={pods} states={states} localGovernments={localGovernments} />
                      </ModalLauncher>
                      <ModalLauncher buttonLabel={<span aria-hidden="true">Roster</span>} title={`Manage roster for ${name}`} description="Open the full profile path for deeper roster controls." eyebrow="Roster control" triggerStyle={{ borderRadius: 10, border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#166534', minWidth: 62, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: '0 10px', fontSize: 13 }}>
                        <div style={{ display: 'grid', gap: 16 }}>
                          <Card title="Mallam roster manager" eyebrow="Roster control">
                            <div style={{ color: '#475569', lineHeight: 1.6 }}>Use the mallam profile for the full roster surface. This quick action stays lightweight here so pod-first routing still happens in one focused place.</div>
                          </Card>
                          <Link href={`/mallams/${mallam.id}`} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>Open full roster manager</Link>
                        </div>
                      </ModalLauncher>
                      <ModalLauncher buttonLabel={<span aria-hidden="true">Remove</span>} title={`Delete ${name}`} description="Remove this mallam from the live roster carefully." eyebrow="Danger zone" triggerStyle={{ borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', minWidth: 70, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none', padding: '0 10px', fontSize: 13 }}>
                        <DeleteMallamForm mallam={mallam} />
                      </ModalLauncher>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </AdminDirectory>
    </PageShell>
  );
}
