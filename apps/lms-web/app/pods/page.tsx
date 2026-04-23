import { CreatePodForm, DeletePodForm, UpdatePodForm } from '../../components/admin-forms';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCenters, fetchDeviceRegistrations, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates } from '../../lib/api';
import { podGeographyLabel } from '../../lib/geography';
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

export default async function PodsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [pods, centers, states, localGovernments, mallams, deviceRegistrations] = await Promise.all([
    fetchPods(),
    fetchCenters(),
    fetchStates(),
    fetchLocalGovernments(),
    fetchMallams(),
    fetchDeviceRegistrations(),
  ]);

  const activePods = pods.filter((pod) => (pod.status || '').toLowerCase() === 'active').length;

  return (
    <PageShell
      title="Pods"
      subtitle="Create, update, retire, and inspect operational pods without hiding the workflow behind a redirect."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ModalLauncher buttonLabel="Add pod" title="Add pod" description="Create a real pod record with geography, mallam ownership, and live operational details." eyebrow="Pod admin">
              <CreatePodForm centers={centers} mallams={mallams} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
          </div>
          <Card title="Pod snapshot" eyebrow="Live API">
            <MetricList
              items={[
                { label: 'Pods', value: String(pods.length) },
                { label: 'Active pods', value: String(activePods) },
                { label: 'Mallams linked', value: String(pods.filter((pod) => (pod.mallamIds || []).length).length) },
                { label: 'Tablets attached', value: String(deviceRegistrations.filter((device) => device.podId).length) },
              ]}
            />
          </Card>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />

      <section style={{ ...responsiveGrid(260), marginBottom: 20 }}>
        {pods.slice(0, 3).map((pod) => {
          const podDevices = deviceRegistrations.filter((item) => item.podId === pod.id);
          return (
            <Card key={pod.id} title={pod.label} eyebrow={pod.status || 'Pod'}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Pill label={`${pod.learnersActive || 0} learners`} tone="#EEF2FF" text="#3730A3" />
                  <Pill label={(pod.mallamNames || []).join(', ') || 'No mallam'} tone="#ECFDF5" text="#166534" />
                  <Pill label={`${podDevices.length} tablet${podDevices.length === 1 ? '' : 's'}`} tone="#F5F3FF" text="#6D28D9" />
                </div>
                <div style={{ color: '#475569', lineHeight: 1.6 }}>
                  Type: <strong>{pod.type || 'Unknown'}</strong><br />
                  Geography: <strong>{podGeographyLabel(pod, centers, states, localGovernments)}</strong><br />
                  Connectivity: <strong>{pod.connectivity || '—'}</strong>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <div style={{ marginBottom: 20 }}>
        <Card title="Pod registry" eyebrow="CRUD admin">
          <SimpleTable
            columns={['Pod', 'Status', 'Geography', 'Learners', 'Mallams', 'Tablets', 'Center', 'Actions']}
            rows={pods.map((pod) => {
              const podDevices = deviceRegistrations.filter((item) => item.podId === pod.id);
              return [
                pod.label || pod.id,
                <Pill key={`${pod.id}-status`} label={pod.status || 'Unknown'} tone="#F8FAFC" text="#334155" />,
                podGeographyLabel(pod, centers, states, localGovernments),
                String(pod.learnersActive || 0),
                (pod.mallamNames || []).join(', ') || '—',
                String(podDevices.length),
                pod.centerName || 'Derived from geography',
                <div key={`${pod.id}-actions`} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ModalLauncher buttonLabel="Edit" title={`Edit ${pod.label}`} description="Update pod geography, mallam ownership, and live operating details." eyebrow="Pod admin" triggerStyle={{ background: '#E2E8F0', color: '#0f172a', boxShadow: 'none', padding: '10px 12px', borderRadius: 12 }}>
                    <UpdatePodForm pod={pod} centers={centers} mallams={mallams} states={states} localGovernments={localGovernments} />
                  </ModalLauncher>
                  <ModalLauncher buttonLabel="Delete" title={`Delete ${pod.label}`} description="Delete is guarded. If the pod still has tablets, learners, mallams, or cohorts linked, the API blocks it." eyebrow="Pod admin" triggerStyle={{ background: '#FEE2E2', color: '#991B1B', boxShadow: 'none', padding: '10px 12px', borderRadius: 12 }}>
                    <DeletePodForm pod={pod} />
                  </ModalLauncher>
                </div>,
              ];
            })}
          />
        </Card>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16 }}>
        <Card title="Pod-linked tablets" eyebrow="Operational context">
          <SimpleTable
            columns={['Pod', 'Tablet', 'Mallam', 'Status', 'Last seen']}
            rows={deviceRegistrations.length ? deviceRegistrations.filter((item) => item.podId).map((registration) => [
              registration.podLabel || 'Unassigned',
              registration.deviceIdentifier,
              registration.assignedMallamName || '—',
              registration.status || 'Unknown',
              formatDateTime(registration.lastSeenAt),
            ]) : [[<span key="empty" style={{ color: '#64748b' }}>No pod-linked tablets yet.</span>, '', '', '', '']]}
          />
        </Card>

        <Card title="Why this matters" eyebrow="Closeout note">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              'Pods own their mallam linkage directly instead of forcing operators to reverse-engineer ownership from device rows.',
              'Center stays de-emphasized in pod creation. Geography and assigned mallam drive the pod; center is derived where possible.',
              'Devices still show up here for context, but the standalone Devices route handles registration and reassignment cleanly.',
            ].map((detail) => (
              <div key={detail} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#475569', lineHeight: 1.7 }}>{detail}</div>
            ))}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
