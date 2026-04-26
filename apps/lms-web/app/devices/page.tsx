import { CreateDeviceRegistrationForm, DeleteDeviceRegistrationForm } from '../../components/admin-forms';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { updateDeviceRegistrationAction } from '../actions';
import { fetchDeviceRegistrations, fetchPods } from '../../lib/api';
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
              { label: 'Waiting for pod assignment', value: String(registrations.length - assignedCount) },
              { label: 'Active status', value: String(activeCount) },
            ]} />
          </Card>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? routeAlert(`Devices is running in degraded mode: ${failedSources.join(', ')} ${failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable. Registration and reassignment can still run, but confirm pod ownership before assuming the tablet map is current.`) : null}
      {!registrations.length ? routeAlert('No tablet registrations are loading right now. That might be a truly empty fleet, but it can also mean the admin feed is degraded. Verify the pod registry before calling the rollout clean.', failedSources.length ? 'error' : 'warning') : null}

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
            columns={['Device', 'Pod', 'Mallam', 'Geography', 'Status', 'Last seen', 'Actions']}
            rows={registrations.length ? registrations.map((registration) => {
              const [tone, text] = toneForStatus(registration.status);
              return [
                <div key={`${registration.id}-device`} style={{ display: 'grid', gap: 4 }}>
                  <strong>{registration.deviceIdentifier}</strong>
                  <span style={{ color: '#64748b' }}>{registration.serialNumber || registration.platform}{registration.appVersion ? ` • app ${registration.appVersion}` : ''}</span>
                </div>,
                registration.podLabel || 'Unassigned',
                registration.assignedMallamName || '—',
                registration.stateName && registration.localGovernmentName ? `${registration.stateName} / ${registration.localGovernmentName}` : registration.centerName || 'Pending geography',
                <Pill key={`${registration.id}-status`} label={registration.status || 'Unknown'} tone={tone} text={text} />,
                formatDateTime(registration.lastSeenAt),
                <div key={`${registration.id}-actions`} style={{ display: 'grid', gap: 10 }}>
                  <form action={updateDeviceRegistrationAction} style={{ display: 'grid', gap: 10, padding: 12, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <input type="hidden" name="registrationId" value={registration.id} />
                    <input type="hidden" name="returnPath" value="/devices" />
                    <select name="podId" defaultValue={registration.podId || ''} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', background: 'white', fontSize: 14 }}>
                      <option value="">Unassigned pod</option>
                      {pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}
                    </select>
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'white', border: '1px solid #e2e8f0', color: '#475569', fontSize: 14 }}>
                      <strong style={{ color: '#0f172a' }}>Device identifier:</strong> {registration.deviceIdentifier}
                      <div style={{ marginTop: 4, color: '#64748b' }}>Tablet identity is stable here. Re-point the pod if ops moved the device; do not rename it casually.</div>
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
