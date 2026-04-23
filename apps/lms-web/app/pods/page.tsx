import Link from 'next/link';
import { updateDeviceRegistrationAction } from '../actions';
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

function toneForDeviceStatus(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return ['#DCFCE7', '#166534'] as const;
  if (normalized === 'inactive') return ['#FEF3C7', '#92400E'] as const;
  return ['#E2E8F0', '#334155'] as const;
}

export default async function PodsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [pods, centers, states, localGovernments, deviceRegistrations, mallams] = await Promise.all([
    fetchPods(),
    fetchCenters(),
    fetchStates(),
    fetchLocalGovernments(),
    fetchDeviceRegistrations(),
    fetchMallams(),
  ]);
  const activePods = pods.filter((pod) => (pod.status || '').toLowerCase() === 'active');
  const mappedRegistrations = deviceRegistrations.map((registration) => {
    const pod = pods.find((item) => item.id === registration.podId) ?? null;
    const podMallamNames = pod?.mallamNames || [];
    const mallamOptionPool = registration.podId
      ? mallams.filter((mallam) => (mallam.podIds || []).includes(registration.podId as string))
      : [];
    const mallamOptions = mallamOptionPool.length
      ? mallamOptionPool
      : registration.assignedMallamId
        ? mallams.filter((mallam) => mallam.id === registration.assignedMallamId)
        : [];

    return {
      ...registration,
      geographyLabel: registration.stateName && registration.localGovernmentName
        ? `${registration.stateName} / ${registration.localGovernmentName}`
        : pod
          ? podGeographyLabel(pod, centers, states, localGovernments)
          : 'Geography pending',
      pod,
      podMallamNames,
      mallamOptions,
    };
  });

  const assignedRegistrations = mappedRegistrations.filter((item) => item.podId).length;
  const unassignedRegistrations = mappedRegistrations.length - assignedRegistrations;
  const activeRegistrations = mappedRegistrations.filter((item) => (item.status || '').toLowerCase() === 'active').length;

  return (
    <PageShell
      title="Pods"
      subtitle="Monitor pod composition, mallam assignment, learner throughput, and the tablets registered to each pod without bouncing into a fake separate admin lane."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Pod snapshot" eyebrow="Live API">
          <MetricList
            items={[
              { label: 'Pods', value: String(pods.length) },
              { label: 'Active pods', value: String(activePods.length) },
              { label: 'Registered tablets', value: String(mappedRegistrations.length) },
              { label: 'Unassigned tablets', value: String(unassignedRegistrations) },
            ]}
          />
        </Card>
      }
    >
      {query?.message ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#3730A3', fontWeight: 700 }}>
          {query.message}
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(260), marginBottom: 20 }}>
        {pods.slice(0, 3).map((pod) => (
          <Card key={pod.id} title={pod.label || pod.id} eyebrow={pod.status || 'Pod'}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={`${pod.learnersActive || 0} learners`} tone="#EEF2FF" text="#3730A3" />
                <Pill label={(pod.mallamNames || []).join(', ') || 'No mallam'} tone="#ECFDF5" text="#166534" />
                <Pill
                  label={`${mappedRegistrations.filter((item) => item.podId === pod.id).length} tablet${mappedRegistrations.filter((item) => item.podId === pod.id).length === 1 ? '' : 's'}`}
                  tone="#F5F3FF"
                  text="#6D28D9"
                />
              </div>
              <div style={{ color: '#475569', lineHeight: 1.6 }}>
                Type: <strong>{pod.type || 'Unknown'}</strong><br />
                Center: <strong>{pod.centerName || 'Unknown'}</strong><br />
                Geography: <strong>{podGeographyLabel(pod, centers, states, localGovernments)}</strong>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Pod registry" eyebrow="Delivery structure">
          <SimpleTable
            columns={['Pod', 'Status', 'Geography', 'Learners', 'Mallams', 'Type', 'Center', 'Actions']}
            rows={pods.map((pod) => [
              pod.label || pod.id,
              <Pill key={`${pod.id}-status`} label={pod.status || 'Unknown'} tone="#F8FAFC" text="#334155" />,
              podGeographyLabel(pod, centers, states, localGovernments),
              String(pod.learnersActive || 0),
              (pod.mallamNames || []).join(', ') || '—',
              pod.type || '—',
              pod.centerName || '—',
              <Link key={`${pod.id}-link`} href="/assignments" style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>
                Open assignments
              </Link>,
            ])}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 16, marginBottom: 20 }}>
        <Card title="Tablet registry by pod" eyebrow="Admin surface for pod-scoped devices">
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ ...responsiveGrid(170), gap: 12 }}>
              {[
                ['Registered tablets', String(mappedRegistrations.length)],
                ['Assigned to a pod', String(assignedRegistrations)],
                ['Waiting for pod assignment', String(unassignedRegistrations)],
                ['Active status', String(activeRegistrations)],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 16, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', marginBottom: 6 }}>{label}</div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <SimpleTable
              columns={['Device', 'Pod', 'Mallam', 'Geography', 'Status', 'Last seen']}
              rows={mappedRegistrations.length ? mappedRegistrations.map((registration) => {
                const [tone, text] = toneForDeviceStatus(registration.status);
                return [
                  <div key={`${registration.id}-device`} style={{ display: 'grid', gap: 4 }}>
                    <strong>{registration.deviceIdentifier}</strong>
                    <span style={{ color: '#64748b' }}>{registration.serialNumber || registration.platform}</span>
                  </div>,
                  registration.podLabel || 'Unassigned',
                  registration.assignedMallamName || registration.podMallamNames.join(', ') || '—',
                  registration.geographyLabel,
                  <Pill key={`${registration.id}-status`} label={registration.status || 'Unknown'} tone={tone} text={text} />, 
                  formatDateTime(registration.lastSeenAt),
                ];
              }) : [[<span key="none" style={{ color: '#64748b' }}>No device registrations are visible yet.</span>, '', '', '', '', '']]}
            />
          </div>
        </Card>

        <Card title="Why this lives in Pods" eyebrow="Surface decision">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              'Tablets are now pod-scoped operational assets, so the Pods route is where assignment truth belongs. Hiding them under generic settings would make field ops harder, not cleaner.',
              'Each registration now shows the full chain: device → pod → mallam → state / local government. That is the context operators actually need when a tablet drifts or gets reissued.',
              'Reassignment is handled inline, so admins can move a tablet between pods or update its responsible mallam without leaving the pod operations surface.',
            ].map((detail) => (
              <div key={detail} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#475569', lineHeight: 1.7 }}>
                {detail}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <Card title="Assign or reassign a tablet" eyebrow="Inline device admin">
          <div style={{ display: 'grid', gap: 14 }}>
            {mappedRegistrations.length ? mappedRegistrations.map((registration) => {
              const podOptions = pods.map((pod) => ({ id: pod.id, label: pod.label || pod.id }));
              const currentPodId = registration.podId || '';
              const mallamOptions = registration.mallamOptions;

              return (
                <form key={registration.id} action={updateDeviceRegistrationAction} style={{ padding: 18, borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', display: 'grid', gap: 14 }}>
                  <input type="hidden" name="registrationId" value={registration.id} />
                  <input type="hidden" name="returnPath" value="/pods" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong style={{ fontSize: 17 }}>{registration.deviceIdentifier}</strong>
                      <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                        {registration.serialNumber || 'No serial recorded'} • {registration.platform}
                        {registration.appVersion ? ` • app ${registration.appVersion}` : ''}
                      </div>
                    </div>
                    <Pill label={registration.status || 'Unknown'} tone={toneForDeviceStatus(registration.status)[0]} text={toneForDeviceStatus(registration.status)[1]} />
                  </div>

                  <div style={{ ...responsiveGrid(220), gap: 12 }}>
                    <label style={{ display: 'grid', gap: 6, color: '#475569', fontWeight: 700 }}>
                      Pod assignment
                      <select name="podId" defaultValue={currentPodId} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 14px', background: 'white', fontSize: 14 }}>
                        <option value="">Unassigned</option>
                        {podOptions.map((pod) => (
                          <option key={pod.id} value={pod.id}>{pod.label}</option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: 'grid', gap: 6, color: '#475569', fontWeight: 700 }}>
                      Responsible mallam
                      <select name="assignedMallamId" defaultValue={registration.assignedMallamId || ''} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 14px', background: 'white', fontSize: 14 }}>
                        <option value="">No direct mallam assignment</option>
                        {mallamOptions.map((mallam) => (
                          <option key={mallam.id} value={mallam.id}>{mallam.displayName || mallam.name}</option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: 'grid', gap: 6, color: '#475569', fontWeight: 700 }}>
                      Device status
                      <select name="status" defaultValue={registration.status || 'active'} style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 14px', background: 'white', fontSize: 14 }}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="repair">Repair</option>
                        <option value="retired">Retired</option>
                      </select>
                    </label>

                    <label style={{ display: 'grid', gap: 6, color: '#475569', fontWeight: 700 }}>
                      App version
                      <input name="appVersion" defaultValue={registration.appVersion || ''} placeholder="0.1.0" style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: '12px 14px', background: 'white', fontSize: 14 }} />
                    </label>
                  </div>

                  <div style={{ ...responsiveGrid(220), gap: 12 }}>
                    <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', marginBottom: 6 }}>Current pod</div>
                      <strong>{registration.podLabel || 'Unassigned'}</strong>
                    </div>
                    <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', marginBottom: 6 }}>Mallam context</div>
                      <strong>{registration.assignedMallamName || registration.podMallamNames.join(', ') || 'No mallam linked'}</strong>
                    </div>
                    <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', marginBottom: 6 }}>Geography</div>
                      <strong>{registration.geographyLabel}</strong>
                    </div>
                    <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', marginBottom: 6 }}>Registered</div>
                      <strong>{formatDateTime(registration.registeredAt)}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                    <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}>
                      Save device assignment
                    </button>
                  </div>
                </form>
              );
            }) : (
              <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                No device registrations are available yet. The backend is ready, but field registration still needs tablets to enroll.
              </div>
            )}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
