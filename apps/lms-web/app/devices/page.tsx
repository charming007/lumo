import { CreateDeviceRegistrationForm, DeleteDeviceRegistrationForm } from '../../components/admin-forms';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { updateDeviceRegistrationAction } from '../actions';
import { fetchDeviceRegistrations, fetchPods } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

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

function toneForStatus(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return ['#DCFCE7', '#166534'] as const;
  if (normalized === 'repair') return ['#FEE2E2', '#991B1B'] as const;
  if (normalized === 'inactive') return ['#FEF3C7', '#92400E'] as const;
  return ['#E2E8F0', '#334155'] as const;
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

export default async function DevicesPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Devices"
        subtitle="Tablet deployment control is blocked until the LMS is pointed at a real production API, because fake-clean device maps are rollout poison."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: devices API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} the tablet registry cannot be trusted for pod ownership, rollout coverage, or repair-state triage. Fix the env var, redeploy, then verify live device data.
          </>
        )}
        whyBlocked={[
          'Devices is not just an inventory table. It controls where tablets are assigned, which pod owns them, and whether the rollout footprint is actually covered.',
          'If production is pointed at localhost, a placeholder host, or no backend, a clean-looking device map turns into dangerous fiction fast.',
        ]}
        verificationItems={[
          {
            surface: 'Tablet registry',
            expected: 'Live device rows, pod linkage, mallam ownership, and status values load from the backend',
            failure: 'Registry looks empty or stable only because the LMS never connected to the real API',
          },
          {
            surface: 'Registration / reassignment flows',
            expected: 'Pod selectors load and device writes submit against the live backend',
            failure: 'Operators think a tablet moved when the deployment was disconnected the whole time',
          },
          {
            surface: 'Rollout coverage',
            expected: 'Pod-linked tablet counts still match the actual deployment footprint after save',
            failure: 'Tablet ownership, repair queue, or duplicate-device warnings are based on dead data',
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
  const [registrationsResult, podsResult] = await Promise.allSettled([
    fetchDeviceRegistrations(),
    fetchPods(),
  ]);

  const registrations = registrationsResult.status === 'fulfilled' ? registrationsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const failedSources = [
    registrationsResult.status === 'rejected' ? 'device registrations' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
  ].filter(Boolean);
  const missingPodRegistry = podsResult.status === 'fulfilled' && pods.length === 0;

  if (failedSources.length || missingPodRegistry) {
    const blockerHeadline = missingPodRegistry
      ? 'Deployment blocker: device pod registry is empty.'
      : 'Deployment blocker: device rollout feeds are degraded.';
    const blockerDetail = missingPodRegistry
      ? (
        <>
          The live <strong>pods</strong> feed returned zero rows. Pod selection is the deployment source of truth for tablet geography, facilitator ownership, and duplicate-device checks, so leaving registration and reassignment controls interactive here would let operators write blind rollout state against an empty ownership graph.
        </>
      )
      : (
        <>
          The live <strong>{failedSources.join(' + ')}</strong> {failedSources.length === 1 ? 'feed has' : 'feeds have'} failed to load. Leaving registration and reassignment controls interactive here would let operators move tablets, trust stale ownership, or create duplicates without seeing the real fleet state.
        </>
      );

    return (
      <DeploymentBlockerCard
        title="Devices"
        subtitle={missingPodRegistry
          ? 'Tablet rollout control should stop cold when the pod registry has no live ownership rows.'
          : 'Tablet rollout control should stop cold when the registry or pod feed goes blind.'}
        blockerHeadline={blockerHeadline}
        blockerDetail={blockerDetail}
        whyBlocked={[
          'Devices is an operational write surface. If the registry is down, a calm-looking table or empty state becomes dangerous fiction.',
          'Pod linkage is the source of truth for tablet ownership and rollout geography. If that feed is missing or empty, reassignment is guesswork with a nice button.',
          'This route should behave like the other hardened admin surfaces: block loudly when the control plane is blind instead of inviting unsafe writes.',
        ]}
        verificationItems={[
          {
            surface: 'Device registry feed',
            expected: 'Live tablet rows load before any operator can trust coverage, ownership, or duplicate detection',
            failure: 'Registration or reassignment stays interactive while the fleet view is stale or empty from a failed fetch',
          },
          {
            surface: 'Pod ownership feed',
            expected: 'Pod selectors and derived geography load from the live backend before a tablet move is allowed',
            failure: missingPodRegistry
              ? 'Operators can submit a tablet change while the live pod registry is empty, so ownership and geography are effectively undefined'
              : 'Operators can submit a tablet change while pod ownership is missing or out of date',
          },
          {
            surface: 'Rollout trust',
            expected: 'The route blocks until both feeds recover, then device writes happen against a visible, current fleet map',
            failure: 'Deployment review mistakes a degraded control surface for a healthy rollout console',
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

  const activeCount = registrations.filter((item) => (item.status || '').toLowerCase() === 'active').length;
  const assignedCount = registrations.filter((item) => item.podId).length;

  return (
    <PageShell
      title="Devices"
      subtitle="Register and manage tablets with pod selection as the source of truth for geography and ownership. One pod should map to one active tablet scope."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ModalLauncher buttonLabel="Register tablet" title="Register tablet" description="Register a tablet by picking its pod and giving it a short tablet name." eyebrow="Device admin">
              <CreateDeviceRegistrationForm pods={pods} />
            </ModalLauncher>
          </div>
          <Card title="Device snapshot" eyebrow="Live API">
            <MetricList items={[
              { label: 'Registered tablets', value: String(registrations.length) },
              { label: 'Assigned to pods', value: String(assignedCount) },
              { label: 'Records missing pod linkage', value: String(registrations.length - assignedCount) },
              { label: 'Active status', value: String(activeCount) },
            ]} />
          </Card>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />
      {!registrations.length ? routeAlert('No tablet registrations are loading right now. That might be a truly empty fleet, but it can also mean the rollout has not started yet. Verify the pod registry before calling the fleet clean.', 'warning') : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        {[
          ['Pods receiving devices', String(new Set(registrations.map((item) => item.podId).filter(Boolean)).size)],
          ['Pods with duplicate tablets', String(Array.from(new Set(registrations.map((item) => item.podId).filter(Boolean))).filter((podId) => registrations.filter((item) => item.podId === podId && (item.status || '').toLowerCase() !== 'retired').length > 1).length)],
          ['Repair queue', String(registrations.filter((item) => (item.status || '').toLowerCase() === 'repair').length)],
          ['Retired devices', String(registrations.filter((item) => (item.status || '').toLowerCase() === 'retired').length)],
        ].map(([label, value]) => (
          <Card key={label} title={value} eyebrow={label}><div style={{ color: '#64748b' }}>Pod selection now carries the geography and ownership context so operators do not have to re-enter the same deployment metadata five times.</div></Card>
        ))}
      </section>

      <Card title="Tablet registry" eyebrow="Standalone device admin">
        <div style={{ display: 'grid', gap: 16 }}>
          <SimpleTable
            columns={['Device', 'Pod', 'Primary mallam', 'Geography', 'Status', 'Last seen', 'Actions']}
            rows={registrations.length ? registrations.map((registration) => {
              const [tone, text] = toneForStatus(registration.status);
              return [
                <div key={`${registration.id}-device`} style={{ display: 'grid', gap: 4 }}>
                  <strong>{registration.deviceIdentifier}</strong>
                  <span style={{ color: '#64748b' }}>{registration.serialNumber || registration.platform}{registration.appVersion ? ` • app ${registration.appVersion}` : ''}</span>
                </div>,
                registration.podLabel || 'Unassigned',
                registration.assignedMallamName || '—',
                registration.stateName && registration.localGovernmentName ? `${registration.stateName} / ${registration.localGovernmentName}` : registration.centerName || 'Derived from selected pod',
                <Pill key={`${registration.id}-status`} label={registration.status || 'Unknown'} tone={tone} text={text} />,
                formatDateTime(registration.lastSeenAt),
                <div key={`${registration.id}-actions`} style={{ display: 'grid', gap: 10 }}>
                  <form action={updateDeviceRegistrationAction} style={{ display: 'grid', gap: 10, padding: 12, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <input type="hidden" name="registrationId" value={registration.id} />
                    <input type="hidden" name="returnPath" value="/devices" />
                    <select name="podId" defaultValue={registration.podId || ''} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', background: 'white', fontSize: 14 }} required>
                      <option value="">Select pod</option>
                      {pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}
                    </select>
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'white', border: '1px solid #e2e8f0', color: '#475569', fontSize: 14 }}>
                      <strong style={{ color: '#0f172a' }}>Device identifier:</strong> {registration.deviceIdentifier}
                      <div style={{ marginTop: 4, color: '#64748b' }}>Tablet identity is stable here. Re-point the pod if ops moved the device; mallam and geography should follow from that pod, not from a second ad-hoc device field.</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <select name="status" defaultValue={registration.status || 'active'} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', background: 'white', fontSize: 14 }}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="repair">Repair</option>
                        <option value="retired">Retired</option>
                      </select>
                      <input name="appVersion" defaultValue={registration.appVersion || ''} placeholder="App version" style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', background: 'white', fontSize: 14 }} />
                    </div>
                    <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 10, padding: '10px 12px', fontWeight: 700 }}>Save</button>
                  </form>
                  <ModalLauncher buttonLabel="Remove" title={`Remove ${registration.deviceIdentifier}`} description="Delete this device registration from the admin surface." eyebrow="Device admin" triggerStyle={{ background: '#FEE2E2', color: '#991B1B', boxShadow: 'none', padding: '10px 12px', borderRadius: 12 }}>
                    <DeleteDeviceRegistrationForm registrationId={registration.id} deviceIdentifier={registration.deviceIdentifier} />
                  </ModalLauncher>
                </div>,
              ];
            }) : [[<span key="empty" style={{ color: '#64748b' }}>No device registrations yet.</span>, '', '', '', '', '', '']]}
          />
        </div>
      </Card>
    </PageShell>
  );
}
