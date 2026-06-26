'use client';

import type { DeviceRegistration } from '../lib/types';
import { CopyableTextCard } from './copyable-text-card';

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const withoutHash = trimmed.split('#', 1)[0] ?? trimmed;
  const withoutQuery = withoutHash.split('?', 1)[0] ?? withoutHash;
  const withScheme = withoutQuery.includes('://') ? withoutQuery : `https://${withoutQuery}`;
  const withoutKnownSuffix = withScheme.replace(/\/api\/v1(?:\/learner-app(?:\/bootstrap)?)?\/+$/i, '');

  return withoutKnownSuffix.replace(/\/+$/, '');
}

function toneForStatus(status?: string | null) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'active') return { background: '#ECFDF5', border: '#BBF7D0', accent: '#166534' };
  if (normalized === 'repair') return { background: '#FFF7ED', border: '#FED7AA', accent: '#9A3412' };
  if (normalized === 'inactive') return { background: '#FEF3C7', border: '#FDE68A', accent: '#92400E' };
  return { background: '#F8FAFC', border: '#E2E8F0', accent: '#334155' };
}

function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function buildBootstrapProbe(apiBase: string, deviceIdentifier: string) {
  const base = normalizeBaseUrl(apiBase);
  const probe = new URL(`${base}/api/v1/learner-app/bootstrap`);
  probe.searchParams.set('deviceIdentifier', deviceIdentifier);
  return probe.toString();
}

function buildReleaseEnv(apiBase: string, deviceIdentifier: string, buildCommand: 'npm run build:learner:web' | 'npm run build:learner:apk') {
  return [
    `LUMO_API_BASE_URL=${shellEscape(normalizeBaseUrl(apiBase))}`,
    `LUMO_DEVICE_IDENTIFIER=${shellEscape(deviceIdentifier)}`,
    buildCommand,
  ].join(' \\\n');
}

function buildBootstrapCurl(apiBase: string, deviceIdentifier: string) {
  const base = normalizeBaseUrl(apiBase);
  return [
    `export API_BASE=${shellEscape(base)}`,
    `export DEVICE_IDENTIFIER=${shellEscape(deviceIdentifier)}`,
    "curl -fsS \"$API_BASE/api/v1/learner-app/bootstrap?deviceIdentifier=$DEVICE_IDENTIFIER\" \\",
    "  -H 'Accept: application/json'",
  ].join('\n');
}

function getDeploymentBlockingReasons(registration: DeviceRegistration, duplicateScopeCount: number) {
  const reasons: string[] = [];
  const normalizedStatus = String(registration.status || '').trim().toLowerCase();

  if (!registration.podId) {
    reasons.push('Pod ownership is missing, so geography and mallam handoff are not trustworthy yet.');
  }

  if (normalizedStatus !== 'active') {
    reasons.push(`Tablet status is ${registration.status || 'unknown'}, so ops should not ship a fresh learner build from this row.`);
  }

  if (registration.podId && duplicateScopeCount > 1) {
    reasons.push('This pod currently has multiple active tablets attached. Resolve the duplicate live device scope before provisioning another learner build.');
  }

  return reasons;
}

export function DeviceDeploymentHandoff({
  registrations,
  apiBase,
}: {
  registrations: DeviceRegistration[];
  apiBase: string;
}) {
  const duplicateScopeCounts = registrations.reduce<Record<string, number>>((accumulator, registration) => {
    const normalizedStatus = String(registration.status || '').trim().toLowerCase();
    if (!registration.podId || normalizedStatus !== 'active') return accumulator;
    accumulator[registration.podId] = (accumulator[registration.podId] || 0) + 1;
    return accumulator;
  }, {});

  const prioritized = [...registrations]
    .map((registration) => {
      const deploymentBlockingReasons = getDeploymentBlockingReasons(registration, duplicateScopeCounts[registration.podId || ''] || 0);
      return {
        registration,
        deploymentBlockingReasons,
        rolloutReady: deploymentBlockingReasons.length === 0,
      };
    })
    .sort((left, right) => {
      const leftReady = left.rolloutReady ? 0 : 1;
      const rightReady = right.rolloutReady ? 0 : 1;
      if (leftReady !== rightReady) return leftReady - rightReady;

      const leftActive = String(left.registration.status || '').toLowerCase() === 'active' ? 0 : 1;
      const rightActive = String(right.registration.status || '').toLowerCase() === 'active' ? 0 : 1;
      if (leftActive !== rightActive) return leftActive - rightActive;
      return left.registration.deviceIdentifier.localeCompare(right.registration.deviceIdentifier);
    });

  if (!prioritized.length) return null;

  const blockedRegistrations = prioritized.filter((entry) => !entry.rolloutReady);
  const readyRegistrations = prioritized.filter((entry) => entry.rolloutReady);
  const missingPodCount = blockedRegistrations.filter((entry) => !entry.registration.podId).length;
  const nonActiveCount = blockedRegistrations.filter((entry) => String(entry.registration.status || '').trim().toLowerCase() !== 'active').length;
  const duplicateScopePodCount = new Set(
    blockedRegistrations
      .filter((entry) => entry.registration.podId && (duplicateScopeCounts[entry.registration.podId || ''] || 0) > 1)
      .map((entry) => entry.registration.podId || '')
      .filter(Boolean),
  ).size;

  return (
    <section style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Tablet deployment handoff</h2>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
          Learner release builds are blocked unless ops ships the exact LMS device identifier with the real production API target. Copy the bundle for the tablet you are provisioning instead of freestyle-typing env vars at 2am.
        </p>
      </div>

      {blockedRegistrations.length ? (
        <div style={{ padding: '16px 18px', borderRadius: 18, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <strong style={{ color: '#9A3412', fontSize: 18 }}>Provisioning blockers need cleanup first</strong>
              <div style={{ color: '#9A3412', lineHeight: 1.6 }}>
                Do not hand rollout ops a copy-paste build bundle for a tablet that is unassigned, not active, or colliding with another live tablet scope. That is how the wrong learner build ships with excellent formatting.
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 999, background: 'white', border: '1px solid #FED7AA', color: '#9A3412', fontWeight: 800 }}>
              {readyRegistrations.length} ready • {blockedRegistrations.length} blocked
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {missingPodCount ? <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', color: '#9A3412', border: '1px solid #FDBA74', fontWeight: 700 }}>{missingPodCount} missing pod link{missingPodCount === 1 ? '' : 's'}</div> : null}
            {nonActiveCount ? <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', color: '#9A3412', border: '1px solid #FDBA74', fontWeight: 700 }}>{nonActiveCount} non-active tablet{nonActiveCount === 1 ? '' : 's'}</div> : null}
            {duplicateScopePodCount ? <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', color: '#9A3412', border: '1px solid #FDBA74', fontWeight: 700 }}>{duplicateScopePodCount} pod scope conflict{duplicateScopePodCount === 1 ? '' : 's'}</div> : null}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 16 }}>
        {prioritized.map(({ registration, deploymentBlockingReasons, rolloutReady }) => {
          const tone = toneForStatus(registration.status);
          const geography = registration.stateName && registration.localGovernmentName
            ? `${registration.stateName} / ${registration.localGovernmentName}`
            : registration.centerName || registration.podLabel || 'Geography pending';
          const bootstrapProbe = buildBootstrapProbe(apiBase, registration.deviceIdentifier);
          const releaseWebEnv = buildReleaseEnv(apiBase, registration.deviceIdentifier, 'npm run build:learner:web');
          const releaseApkEnv = buildReleaseEnv(apiBase, registration.deviceIdentifier, 'npm run build:learner:apk');
          const bootstrapCurl = buildBootstrapCurl(apiBase, registration.deviceIdentifier);

          return (
            <div
              key={registration.id}
              style={{
                display: 'grid',
                gap: 14,
                padding: 18,
                borderRadius: 22,
                background: tone.background,
                border: `1px solid ${tone.border}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1 }}>Provisioning target</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{registration.deviceIdentifier}</div>
                  <div style={{ color: '#475569', lineHeight: 1.5 }}>
                    {registration.podLabel || 'Unassigned pod'}
                    {registration.assignedMallamName ? ` • ${registration.assignedMallamName}` : ''}
                    {` • ${geography}`}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                  <div style={{ padding: '10px 12px', borderRadius: 999, background: 'white', border: `1px solid ${tone.border}`, color: tone.accent, fontWeight: 800 }}>
                    {registration.status || 'Unknown'}
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 999, background: rolloutReady ? '#ECFDF5' : '#FFF7ED', border: `1px solid ${rolloutReady ? '#BBF7D0' : '#FED7AA'}`, color: rolloutReady ? '#166534' : '#9A3412', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {rolloutReady ? 'Rollout-ready bundle' : 'Provisioning blocked'}
                  </div>
                </div>
              </div>

              {rolloutReady ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 14 }}>
                  <CopyableTextCard eyebrow="Learner release env" title="Copy web provisioning bundle" text={releaseWebEnv} tone="white" border={tone.border} />
                  <CopyableTextCard eyebrow="Learner release env" title="Copy APK provisioning bundle" text={releaseApkEnv} tone="white" border={tone.border} />
                  <CopyableTextCard eyebrow="Bootstrap verification" title="Copy bootstrap probe" text={bootstrapProbe} tone="white" border={tone.border} />
                  <CopyableTextCard eyebrow="Bootstrap verification" title="Copy curl smoke test" text={bootstrapCurl} tone="white" border={tone.border} />
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {deploymentBlockingReasons.map((reason) => (
                    <div key={reason} style={{ padding: '12px 14px', borderRadius: 14, background: 'white', border: `1px solid ${tone.border}`, color: tone.accent, lineHeight: 1.6 }}>
                      {reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
