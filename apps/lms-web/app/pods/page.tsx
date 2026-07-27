import { CreatePodForm, DeletePodForm, UpdatePodForm } from '../../components/admin-forms';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { AdminDirectory } from '../../components/admin-directory';
import { fetchCenters, fetchDeviceRegistrations, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { podGeographyLabel } from '../../lib/geography';
import { getPodAdminReferenceHealth } from '../../lib/admin-reference-health';
import { Card, MetricList, PageShell, Pill } from '../../lib/ui';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'P';
}

function capacityPercent(active?: number | null, capacity?: number | null) {
  if (!capacity || capacity <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((active || 0) / capacity) * 100)));
}

function statusTone(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return ['#DCFCE7', '#166534'] as const;
  if (normalized === 'paused') return ['#FEF3C7', '#92400E'] as const;
  return ['#F1F5F9', '#475569'] as const;
}

function routeAlert(message: string, tone: 'warning' | 'error' = 'warning') {
  const palette = tone === 'error'
    ? { background: '#FEF2F2', border: '#FCA5A5', text: '#B91C1C' }
    : { background: '#FFF7ED', border: '#FDBA74', text: '#9A3412' };

  return (
    <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: palette.background, border: `1px solid ${palette.border}`, color: palette.text, fontWeight: 700, lineHeight: 1.6 }}>
      {message}
    </div>
  );
}

export default async function PodsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Pods"
        subtitle="Pod deployment control is blocked until the LMS is pointed at a real production API, because pod ownership lies cascade into every other rollout surface."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: pods API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} the pod registry cannot be trusted for geography, facilitator ownership, or tablet deployment mapping. Fix the env var, redeploy, then verify live pod data.
          </>
        )}
        whyBlocked={[
          'Pods is the operational anchor for mallam ownership, learner routing, geography, and device placement. If this route lies, the rest of the rollout graph lies with it.',
          'Allowing pod writes against a missing, placeholder, or localhost backend is how teams think they changed deployment footprint when they actually changed nothing.',
        ]}
        verificationItems={[
          {
            surface: 'Pod registry',
            expected: 'Live pod rows, geography, mallam ownership, and tablet counts load from the backend',
            failure: 'Registry looks empty or tidy only because the LMS never connected to the real API',
          },
          {
            surface: 'Add / edit pod flows',
            expected: 'Center, mallam, state, and local government selectors load and submit against the live backend',
            failure: 'Forms open with dead selectors, stale references, or writes that disappear into the void',
          },
          {
            surface: 'Tablet linkage',
            expected: 'Pod-linked tablet counts still match the live rollout footprint after save',
            failure: 'Operators think a pod owns tablets or geography it never actually saved',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Devices', href: '/devices', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const [podsResult, centersResult, statesResult, localGovernmentsResult, mallamsResult, deviceRegistrationsResult] = await Promise.allSettled([
    fetchPods(),
    fetchCenters(),
    fetchStates(),
    fetchLocalGovernments(),
    fetchMallams(),
    fetchDeviceRegistrations(),
  ]);

  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const centers = centersResult.status === 'fulfilled' ? centersResult.value : [];
  const states = statesResult.status === 'fulfilled' ? statesResult.value : [];
  const localGovernments = localGovernmentsResult.status === 'fulfilled' ? localGovernmentsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const deviceRegistrations = deviceRegistrationsResult.status === 'fulfilled' ? deviceRegistrationsResult.value : [];
  const podReferenceHealth = getPodAdminReferenceHealth({
    pods,
    centers,
    mallams,
    states,
    localGovernments,
  });
  const failedSources = [
    podsResult.status === 'rejected' ? 'pods' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    ...podReferenceHealth.missingReferences,
    deviceRegistrationsResult.status === 'rejected' ? 'device registrations' : null,
  ].filter((value, index, source) => Boolean(value) && source.indexOf(value) === index) as string[];
  const criticalPodAdminFailures = [
    podsResult.status === 'rejected' ? 'pods' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    ...podReferenceHealth.missingReferences,
  ].filter((value, index, source) => Boolean(value) && source.indexOf(value) === index) as string[];
  const hasCorePodGap = podsResult.status === 'rejected' || podReferenceHealth.blocked;

  if (criticalPodAdminFailures.length) {
    const blockerDetail = criticalPodAdminFailures.length === 1
      ? `The ${criticalPodAdminFailures[0]} feed failed to load from the live API. Leaving pod create, edit, or delete controls up would let operators rewrite rollout ownership while geography or primary mallam context is blind.`
      : `The ${criticalPodAdminFailures.join(', ')} feeds failed to load from the live API. Leaving pod create, edit, or delete controls up would let operators rewrite rollout ownership while geography or primary mallam context is blind.`;

    return (
      <DeploymentBlockerCard
        title="Pods"
        subtitle="Pod admin is a rollout control surface, not a decorative registry. If the ownership feeds are down, the route should block instead of inviting blind writes."
        blockerHeadline="Deployment blocker: pod admin feeds are degraded."
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length > criticalPodAdminFailures.length
              ? `Additional degraded feed${failedSources.length - criticalPodAdminFailures.length === 1 ? '' : 's'}: ${failedSources.filter((source) => !criticalPodAdminFailures.includes(source)).join(', ')}.`
              : ''}
          </>
        )}
        whyBlocked={[
          'Pods define geography, primary mallam ownership, learner routing, and downstream tablet placement. If those reference feeds are degraded, pod writes become polished guesswork.',
          'A banner is too weak here. Modal forms can still open with missing or stale geography and mallam references, which is exactly how rollout ownership gets corrupted under outage conditions.',
          'Device registrations can degrade separately as read-only context, but the core pod admin feeds should stop the route cold when they are blind.',
        ]}
        verificationItems={[
          {
            surface: 'Pod registry + ownership graph',
            expected: 'Live pod rows, geography, and primary mallam ownership all load before operators can trust pod admin',
            failure: 'Pod create/edit/delete controls remain available while the ownership graph is missing or stale',
          },
          {
            surface: 'Geography and mallam selectors',
            expected: 'State, local government, center, and primary mallam references load from the live backend before a pod write is allowed',
            failure: 'Forms open with partial or empty reference data, letting operators save blind changes',
          },
          {
            surface: 'Rollout trust',
            expected: 'The route blocks until the core pod admin feeds recover, then ownership edits happen against visible live references',
            failure: 'Deployment review mistakes a degraded pod control surface for a healthy rollout registry',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Devices', href: '/devices', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const activePods = pods.filter((pod) => (pod.status || '').toLowerCase() === 'active').length;

  return (
    <PageShell
      title="Pods"
      subtitle="Create, update, retire, and inspect operational pods as the anchor for primary mallam, learner, and tablet ownership."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ModalLauncher buttonLabel="Add pod" title="Add pod" description="Create a real pod record with geography, mallam ownership, and live operational details." eyebrow="Pod admin" disabled={hasCorePodGap}>
              <CreatePodForm centers={centers} mallams={mallams} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
          </div>
          <Card title="Pod snapshot" eyebrow="Live API">
            <MetricList
              items={[
                { label: 'Pods', value: String(pods.length) },
                { label: 'Active pods', value: String(activePods) },
                { label: 'Pods with primary mallam', value: String(pods.filter((pod) => (pod.mallamIds || []).length > 0).length) },
                { label: 'Tablets attached', value: String(deviceRegistrations.filter((device) => device.podId).length) },
              ]}
            />
          </Card>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? routeAlert(hasCorePodGap
        ? `Pod admin is degraded because the ${failedSources.join(', ')} feed${failedSources.length === 1 ? ' has' : 's have'} failed. The page stays visible so operators get an honest outage surface instead of a fake-empty registry, but pod create/edit actions are intentionally disabled until the pods feed recovers.`
        : `Pods is running in degraded mode: ${failedSources.join(', ')} ${failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable. Pod edits stay live when possible, but verify geography and linked tablets before treating this screen as authoritative.`) : null}
      {!pods.length ? routeAlert('No pods are loading right now. That could mean a genuinely empty registry or a still-broken upstream seed. Do not treat this as proof the deployment footprint is clean.', failedSources.length ? 'error' : 'warning') : null}

      <AdminDirectory title="All pods" count={pods.length} searchPlaceholder="Search pods...">
        {hasCorePodGap ? (
          <div style={{ color: '#b91c1c', lineHeight: 1.6 }}>Pod registry unavailable. Recover the pods feed before using pod admin actions.</div>
        ) : (
          <>
            <div data-directory-view="grid">
              {pods.map((pod) => {
                const podDevices = deviceRegistrations.filter((item) => item.podId === pod.id);
                const fill = capacityPercent(pod.learnersActive, pod.capacity);
                const [tone, text] = statusTone(pod.status);
                const geography = podGeographyLabel(pod, centers, states, localGovernments);
                const search = [pod.label, pod.status, pod.type, geography, pod.centerName, pod.connectivity, ...(pod.mallamNames || [])].filter(Boolean).join(' ');
                return (
                  <article key={pod.id} data-directory-item data-search={search} style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, border: '1px solid #e4e8ef', background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)', padding: 22, display: 'grid', gap: 18, boxShadow: '0 18px 45px rgba(76, 83, 112, 0.06)' }}>
                    <div aria-hidden="true" style={{ position: 'absolute', inset: '0 0 auto 0', height: 5, background: 'linear-gradient(90deg, #6D5DF7, #FF79C8, #9EE7F2)' }} />
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 58, height: 58, borderRadius: 999, background: '#E5E7EB', color: '#202436', display: 'grid', placeItems: 'center', fontWeight: 850, fontSize: 20, flex: '0 0 auto' }}>{initials(pod.label || pod.id)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 20, color: '#151827' }}>{pod.label || pod.id}</h3>
                        <div style={{ color: '#7b8496', marginTop: 4 }}>{pod.type || 'Pod'} · {geography}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {[['Learners', `${pod.learnersActive || 0}${pod.capacity ? ` / ${pod.capacity}` : ''}`], ['Primary mallam', pod.mallamNames?.[0] || '—'], ['Tablets', String(podDevices.length)], ['Connectivity', pod.connectivity || '—']].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#7b8496' }}><span>{label}:</span><strong style={{ color: '#202436' }}>{value}</strong></div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7b8496' }}><span>Capacity</span><strong style={{ color: '#202436' }}>{fill}%</strong></div>
                      <div style={{ height: 9, borderRadius: 999, background: '#dbe7f5', overflow: 'hidden' }}><div style={{ width: `${fill}%`, height: '100%', borderRadius: 999, background: '#0B73D9' }} /></div>
                    </div>
                    <div style={{ height: 1, background: '#edf0f6' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <Pill label={pod.status || 'Unknown'} tone={tone} text={text} />
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <ModalLauncher buttonLabel="Edit" title={`Edit ${pod.label}`} description="Update pod geography, mallam ownership, and live operating details." eyebrow="Pod admin" triggerStyle={{ background: '#EFF6FF', color: '#1d4ed8', border: '1px solid #bfdbfe', boxShadow: 'none', padding: '9px 12px', borderRadius: 12, fontSize: 13 }}>
                          <UpdatePodForm pod={pod} centers={centers} mallams={mallams} states={states} localGovernments={localGovernments} />
                        </ModalLauncher>
                        <ModalLauncher buttonLabel="Remove" title={`Delete ${pod.label}`} description="Delete is guarded. If the pod still has tablets, learners, mallams, or cohorts linked, the API blocks it." eyebrow="Pod admin" triggerStyle={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #fecaca', boxShadow: 'none', padding: '9px 12px', borderRadius: 12, fontSize: 13 }}>
                          <DeletePodForm pod={pod} />
                        </ModalLauncher>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div data-directory-view="list">
              {pods.map((pod) => {
                const podDevices = deviceRegistrations.filter((item) => item.podId === pod.id);
                const [tone, text] = statusTone(pod.status);
                const geography = podGeographyLabel(pod, centers, states, localGovernments);
                const search = [pod.label, pod.status, pod.type, geography, pod.centerName, ...(pod.mallamNames || [])].filter(Boolean).join(' ');
                return (
                  <div key={pod.id} data-directory-item data-search={search} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.1fr) 120px 120px minmax(150px, 0.9fr) 100px minmax(130px, 0.9fr) minmax(180px, 1fr)', gap: 16, alignItems: 'center', padding: '16px 18px', borderRadius: 18, border: '1px solid #edf0f6', background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span style={{ width: 44, height: 44, borderRadius: 999, background: '#E5E7EB', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{initials(pod.label || pod.id)}</span><strong>{pod.label || pod.id}</strong></div>
                    <Pill label={pod.status || 'Unknown'} tone={tone} text={text} />
                    <div>{pod.learnersActive || 0} learners</div>
                    <div>{pod.mallamNames?.[0] || 'No primary mallam'}</div>
                    <div>{podDevices.length} tablets</div>
                    <div>{geography}</div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <ModalLauncher buttonLabel="Edit" title={`Edit ${pod.label}`} description="Update pod geography, mallam ownership, and live operating details." eyebrow="Pod admin" triggerStyle={{ background: '#EFF6FF', color: '#1d4ed8', border: '1px solid #bfdbfe', boxShadow: 'none', padding: '9px 12px', borderRadius: 12, fontSize: 13 }}>
                        <UpdatePodForm pod={pod} centers={centers} mallams={mallams} states={states} localGovernments={localGovernments} />
                      </ModalLauncher>
                      <ModalLauncher buttonLabel="Remove" title={`Delete ${pod.label}`} description="Delete is guarded. If the pod still has tablets, learners, mallams, or cohorts linked, the API blocks it." eyebrow="Pod admin" triggerStyle={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #fecaca', boxShadow: 'none', padding: '9px 12px', borderRadius: 12, fontSize: 13 }}>
                        <DeletePodForm pod={pod} />
                      </ModalLauncher>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </AdminDirectory>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20, marginTop: 32 }}>
        <Card title="Pod-linked tablets" eyebrow="Operational context">
          <div style={{ display: 'grid', gap: 12 }}>
            {deviceRegistrations.filter((item) => item.podId).length ? deviceRegistrations.filter((item) => item.podId).map((registration) => (
              <div key={registration.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 14, padding: 16, borderRadius: 18, background: '#ffffff', border: '1px solid #edf0f6' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong style={{ color: '#151827' }}>{registration.deviceIdentifier}</strong>
                  <span style={{ color: '#747b8f' }}>{registration.podLabel || 'Unassigned pod'}</span>
                </div>
                <div style={{ display: 'grid', gap: 4, textAlign: 'right' }}>
                  <strong style={{ color: '#151827' }}>{registration.assignedMallamName || 'No mallam'}</strong>
                  <span style={{ color: '#747b8f' }}>{registration.status || 'Unknown'} · {formatDateTime(registration.lastSeenAt)}</span>
                </div>
              </div>
            )) : (
              <div style={{ color: '#64748b', padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>No pod-linked tablets yet.</div>
            )}
          </div>
        </Card>

        <Card title="Why this matters" eyebrow="Closeout note">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              'Pods own their mallam linkage directly, with one primary mallam per pod instead of a fuzzy multi-owner list.',
              'Center stays de-emphasized in pod creation. Geography drives the pod; mallam deployment should align to that footprint, not override it.',
              'Devices still show up here for context, but the standalone Devices route handles the single-tablet-per-pod scope cleanly.',
            ].map((detail) => (
              <div key={detail} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#475569', lineHeight: 1.7 }}>{detail}</div>
            ))}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
