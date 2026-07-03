import Link from 'next/link';
import { CreateDeviceRegistrationForm, DeleteDeviceRegistrationForm } from '../../components/admin-forms';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { AdminDirectory } from '../../components/admin-directory';
import { updateDeviceRegistrationAction } from '../actions';
import { fetchDeviceRegistrations, fetchPods } from '../../lib/api';
import { API_BASE, API_BASE_DIAGNOSTIC } from '../../lib/config';
import { getDeviceDeploymentReadiness } from '../../lib/device-deployment';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../lib/ui';
import { DeviceDeploymentHandoff } from '../../components/device-deployment-handoff';

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

function initials(value: string) {
  return value.split(/[-_\s]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'D';
}

function displayDeviceIdentifier(value?: string | null) {
  const normalized = String(value || '').trim();
  return normalized || 'Device identifier missing';
}

function DeviceEditForm({ registration, pods }: { registration: Awaited<ReturnType<typeof fetchDeviceRegistrations>>[number]; pods: Awaited<ReturnType<typeof fetchPods>> }) {
  return (
    <form action={updateDeviceRegistrationAction} style={{ display: 'grid', gap: 16 }}>
      <input type="hidden" name="registrationId" value={registration.id} />
      <input type="hidden" name="returnPath" value="/devices" />
      <label style={{ display: 'grid', gap: 8, color: '#334155', fontWeight: 750 }}>
        Pod
        <select name="podId" defaultValue={registration.podId || ''} style={{ border: '1px solid #d8deea', borderRadius: 14, padding: '13px 15px', background: '#ffffff', fontSize: 15 }} required>
          <option value="">Select pod</option>
          {pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}
        </select>
      </label>
      <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', lineHeight: 1.6 }}>
        <strong style={{ color: '#0f172a' }}>Device identifier:</strong> {displayDeviceIdentifier(registration.deviceIdentifier)}
        <div style={{ marginTop: 4 }}>Tablet identity is stable here. Re-point the pod if ops moved the device; mallam and geography should follow from that pod.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <label style={{ display: 'grid', gap: 8, color: '#334155', fontWeight: 750 }}>
          Status
          <select name="status" defaultValue={registration.status || 'active'} style={{ border: '1px solid #d8deea', borderRadius: 14, padding: '13px 15px', background: '#ffffff', fontSize: 15 }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="repair">Repair</option>
            <option value="retired">Retired</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 8, color: '#334155', fontWeight: 750 }}>
          App version
          <input name="appVersion" defaultValue={registration.appVersion || ''} placeholder="App version" style={{ border: '1px solid #d8deea', borderRadius: 14, padding: '13px 15px', background: '#ffffff', fontSize: 15 }} />
        </label>
      </div>
      <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 14, padding: '13px 16px', fontWeight: 800, fontSize: 15 }}>Save device</button>
    </form>
  );
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

function describeApiTarget() {
  return API_BASE_DIAGNOSTIC.configuredApiBase ?? API_BASE;
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
  const apiTarget = describeApiTarget();
  const failedSources = [
    registrationsResult.status === 'rejected' ? 'device registrations' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
  ].filter(Boolean);

  if (failedSources.length) {
    return (
      <DeploymentBlockerCard
        title="Devices"
        subtitle="Tablet rollout control should stop cold when the registry or pod feed goes blind."
        blockerHeadline="Deployment blocker: device rollout feeds are degraded."
        blockerDetail={(
          <>
            The live <strong>{failedSources.join(' + ')}</strong> {failedSources.length === 1 ? 'feed has' : 'feeds have'} failed to load. Leaving registration and reassignment controls interactive here would let operators move tablets, trust stale ownership, or create duplicates without seeing the real fleet state.
          </>
        )}
        whyBlocked={[
          'Devices is an operational write surface. If the registry is down, a calm-looking table or empty state becomes dangerous fiction.',
          'Pod linkage is the source of truth for tablet ownership and rollout geography. If that feed is missing, reassignment is guesswork with a nice button.',
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
            failure: 'Operators can submit a tablet change while pod ownership is missing or out of date',
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

  const activeRegistrations = registrations.filter((item) => (item.status || '').toLowerCase() === 'active');
  const activeCount = activeRegistrations.length;
  const assignedCount = registrations.filter((item) => item.podId).length;
  const activeAssignedCount = activeRegistrations.filter((item) => item.podId).length;
  const activePodCount = new Set(activeRegistrations.map((item) => item.podId).filter(Boolean)).size;
  const deviceDeploymentReadiness = getDeviceDeploymentReadiness(registrations);
  const duplicateActivePodCount = new Set(
    deviceDeploymentReadiness.annotated
      .filter((entry) => entry.blockingReasons.includes('duplicate-live-scope') && entry.registration.podId)
      .map((entry) => entry.registration.podId),
  ).size;
  const duplicateDeviceIdentifierCount = new Set(
    deviceDeploymentReadiness.annotated
      .filter((entry) => entry.blockingReasons.includes('duplicate-device-identifier'))
      .map((entry) => String(entry.registration.deviceIdentifier || '').trim().toLowerCase())
      .filter(Boolean),
  ).size;
  const missingIdentifierCount = deviceDeploymentReadiness.annotated.filter((entry) => entry.blockingReasons.includes('missing-device-identifier')).length;
  const missingPodCount = deviceDeploymentReadiness.annotated.filter((entry) => entry.blockingReasons.includes('missing-pod')).length;
  const inactiveBlockingCount = deviceDeploymentReadiness.annotated.filter((entry) => entry.blockingReasons.includes('non-active-status')).length;
  const hasZeroTabletRegistry = !registrations.length;

  const rolloutProvisioningBlocked = Boolean(
    !deviceDeploymentReadiness.hasRolloutReadyRegistration
    || duplicateActivePodCount > 0
    || duplicateDeviceIdentifierCount > 0,
  );
  const rolloutBlockerHeadline = !deviceDeploymentReadiness.hasRolloutReadyRegistration
    ? 'Deployment blocker: learner rollout handoff has no safe tablet target.'
    : duplicateActivePodCount
      ? 'Deployment blocker: duplicate active tablet scope is still live.'
      : 'Deployment blocker: duplicate active device identifiers are still live.';
  const rolloutBlockerDetail = !deviceDeploymentReadiness.hasRolloutReadyRegistration
    ? 'The LMS can see tablet records, but none currently satisfy the rollout rules. Only tablets with a real pod owner, active status, a non-blank device identifier, and no duplicate live scope or device ID should get a learner release bundle.'
    : duplicateActivePodCount
      ? 'Multiple active tablets are still attached to the same live pod scope. That makes learner build targeting ambiguous, so provisioning should stay blocked until each live pod points at exactly one active learner tablet.'
      : 'The live registry still contains duplicated active device identifiers. Until each learner tablet proves a unique backend identity, provisioning should stay blocked instead of pretending rollout handoff is trustworthy.';
  const rolloutOperatorAction = !deviceDeploymentReadiness.hasRolloutReadyRegistration
    ? 'Repair or register at least one active, uniquely scoped tablet with a real device identifier before trusting rollout handoff.'
    : duplicateActivePodCount
      ? 'Resolve duplicate active pod assignments so each live rollout scope points at exactly one active learner tablet.'
      : 'Repair duplicated live device identifiers before generating any learner release bundle.';

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
              { label: 'Active tablets assigned to pods', value: String(activeAssignedCount) },
              { label: 'Records missing pod linkage', value: String(registrations.length - assignedCount) },
              { label: 'Active status', value: String(activeCount) },
            ]} />
          </Card>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />
      {rolloutProvisioningBlocked ? routeAlert(`${rolloutBlockerHeadline} ${rolloutBlockerDetail} ${rolloutOperatorAction} ${missingIdentifierCount} blank device ID${missingIdentifierCount === 1 ? '' : 's'}, ${missingPodCount} missing pod link${missingPodCount === 1 ? '' : 's'}, and ${inactiveBlockingCount} non-active blocking record${inactiveBlockingCount === 1 ? '' : 's'} still need cleanup. Cross-check the dashboard blocker stack at / before provisioning learner builds.`, 'error') : null}
      {hasZeroTabletRegistry ? (
        <div style={{ marginBottom: 16, padding: '18px 20px', borderRadius: 18, background: '#FEF2F2', border: '1px solid #FCA5A5', display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <strong style={{ color: '#991B1B', fontSize: 18 }}>Deployment blocker: learner rollout handoff has zero registered tablets.</strong>
            <div style={{ color: '#991B1B', lineHeight: 1.7 }}>
              No tablet registrations are loading right now. That might be a truly empty fleet, but it can also mean the rollout has not started yet. Until at least one real learner tablet is registered, pod-linked, and visible here, this route should not read as a clean deployment console.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <ModalLauncher buttonLabel="Register first tablet" title="Register tablet" description="Register the first learner tablet so rollout handoff stops being hypothetical." eyebrow="Device admin" triggerStyle={{ background: '#991B1B', color: 'white', border: '1px solid #991B1B', boxShadow: 'none', padding: '10px 14px', borderRadius: 12, fontSize: 13 }}>
              <CreateDeviceRegistrationForm pods={pods} />
            </ModalLauncher>
            <Link href="/settings" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontWeight: 800, borderRadius: 12, padding: '10px 14px', background: '#ffffff', color: '#991B1B', border: '1px solid #FCA5A5' }}>
              Check deployment settings
            </Link>
          </div>
        </div>
      ) : null}

      <DeviceDeploymentHandoff registrations={registrations} apiBase={apiTarget} provisioningBlocked={rolloutProvisioningBlocked} />

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        {[
          ['Pods receiving active tablets', String(activePodCount)],
          ['Pods with duplicate tablets', String(duplicateActivePodCount)],
          ['Repair queue', String(registrations.filter((item) => (item.status || '').toLowerCase() === 'repair').length)],
          ['Retired devices', String(registrations.filter((item) => (item.status || '').toLowerCase() === 'retired').length)],
        ].map(([label, value]) => (
          <Card key={label} title={value} eyebrow={label}><div style={{ color: '#64748b' }}>Pod selection now carries the geography and ownership context so operators do not have to re-enter the same deployment metadata five times.</div></Card>
        ))}
      </section>

      <AdminDirectory title="All devices" count={registrations.length} searchPlaceholder="Search devices...">
        {registrations.length ? (
          <>
            <div data-directory-view="grid">
              {registrations.map((registration) => {
                const [tone, text] = toneForStatus(registration.status);
                const geography = registration.stateName && registration.localGovernmentName ? `${registration.stateName} / ${registration.localGovernmentName}` : registration.centerName || 'Derived from selected pod';
                const deviceLabel = displayDeviceIdentifier(registration.deviceIdentifier);
                const search = [deviceLabel, registration.serialNumber, registration.platform, registration.appVersion, registration.status, registration.podLabel, registration.assignedMallamName, geography].filter(Boolean).join(' ');
                return (
                  <article key={registration.id} data-directory-item data-search={search} style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, border: '1px solid #e4e8ef', background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)', padding: 22, display: 'grid', gap: 18, boxShadow: '0 18px 45px rgba(76, 83, 112, 0.06)' }}>
                    <div aria-hidden="true" style={{ position: 'absolute', inset: '0 0 auto 0', height: 5, background: 'linear-gradient(90deg, #6D5DF7, #FF79C8, #9EE7F2)' }} />
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 58, height: 58, borderRadius: 999, background: '#E5E7EB', color: '#202436', display: 'grid', placeItems: 'center', fontWeight: 850, fontSize: 20, flex: '0 0 auto' }}>{initials(deviceLabel)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 20, color: '#151827' }}>{deviceLabel}</h3>
                        <div style={{ color: '#7b8496', marginTop: 4 }}>{registration.serialNumber || registration.platform}{registration.appVersion ? ` - app ${registration.appVersion}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {[['Pod', registration.podLabel || 'Unassigned'], ['Primary mallam', registration.assignedMallamName || '—'], ['Geography', geography], ['Last seen', formatDateTime(registration.lastSeenAt)]].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#7b8496' }}><span>{label}:</span><strong style={{ color: '#202436', textAlign: 'right' }}>{value}</strong></div>
                      ))}
                    </div>
                    <div style={{ height: 1, background: '#edf0f6' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <Pill label={registration.status || 'Unknown'} tone={tone} text={text} />
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <ModalLauncher buttonLabel="Edit" title={`Edit ${deviceLabel}`} description="Update pod assignment, status, and app version." eyebrow="Device admin" triggerStyle={{ background: '#EFF6FF', color: '#1d4ed8', border: '1px solid #bfdbfe', boxShadow: 'none', padding: '9px 12px', borderRadius: 12, fontSize: 13 }}>
                          <DeviceEditForm registration={registration} pods={pods} />
                        </ModalLauncher>
                        <ModalLauncher buttonLabel="Remove" title={`Remove ${deviceLabel}`} description="Delete this device registration from the admin surface." eyebrow="Device admin" triggerStyle={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #fecaca', boxShadow: 'none', padding: '9px 12px', borderRadius: 12, fontSize: 13 }}>
                          <DeleteDeviceRegistrationForm registrationId={registration.id} deviceIdentifier={deviceLabel} />
                        </ModalLauncher>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div data-directory-view="list">
              {registrations.map((registration) => {
                const [tone, text] = toneForStatus(registration.status);
                const geography = registration.stateName && registration.localGovernmentName ? `${registration.stateName} / ${registration.localGovernmentName}` : registration.centerName || 'Derived from selected pod';
                const deviceLabel = displayDeviceIdentifier(registration.deviceIdentifier);
                const search = [deviceLabel, registration.serialNumber, registration.platform, registration.status, registration.podLabel, registration.assignedMallamName, geography].filter(Boolean).join(' ');
                return (
                  <div key={registration.id} data-directory-item data-search={search} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.2fr) minmax(140px, 0.9fr) minmax(140px, 0.9fr) 110px minmax(150px, 0.9fr) minmax(180px, 1fr)', gap: 16, alignItems: 'center', padding: '16px 18px', borderRadius: 18, border: '1px solid #edf0f6', background: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><span style={{ width: 44, height: 44, borderRadius: 999, background: '#E5E7EB', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{initials(deviceLabel)}</span><strong>{deviceLabel}</strong></div>
                    <div>{registration.podLabel || 'Unassigned'}</div>
                    <div>{registration.assignedMallamName || '—'}</div>
                    <Pill label={registration.status || 'Unknown'} tone={tone} text={text} />
                    <div>{formatDateTime(registration.lastSeenAt)}</div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <ModalLauncher buttonLabel="Edit" title={`Edit ${deviceLabel}`} description="Update pod assignment, status, and app version." eyebrow="Device admin" triggerStyle={{ background: '#EFF6FF', color: '#1d4ed8', border: '1px solid #bfdbfe', boxShadow: 'none', padding: '9px 12px', borderRadius: 12, fontSize: 13 }}>
                        <DeviceEditForm registration={registration} pods={pods} />
                      </ModalLauncher>
                      <ModalLauncher buttonLabel="Remove" title={`Remove ${deviceLabel}`} description="Delete this device registration from the admin surface." eyebrow="Device admin" triggerStyle={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #fecaca', boxShadow: 'none', padding: '9px 12px', borderRadius: 12, fontSize: 13 }}>
                        <DeleteDeviceRegistrationForm registrationId={registration.id} deviceIdentifier={deviceLabel} />
                      </ModalLauncher>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ color: '#64748b', lineHeight: 1.6 }}>No device registrations yet. Treat that as a rollout blocker until the first real learner tablet is registered and tied to a pod.</div>
        )}
      </AdminDirectory>
    </PageShell>
  );
}
