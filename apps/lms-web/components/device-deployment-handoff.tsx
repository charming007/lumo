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

function buildReleaseCommand(apiBase: string, deviceIdentifier: string, buildTarget: 'web' | 'apk') {
  const normalizedApiBase = normalizeBaseUrl(apiBase);
  const buildCommand = buildTarget === 'web'
    ? 'flutter build web --release'
    : 'flutter build apk --release';

  return [
    'cd apps/learner-tablet',
    buildCommand,
    `  --dart-define=LUMO_API_BASE_URL=${shellEscape(normalizedApiBase)}`,
    `  --dart-define=LUMO_DEVICE_IDENTIFIER=${shellEscape(deviceIdentifier)}`,
  ].join(' \\\n');
}

function buildBootstrapCurl(apiBase: string, deviceIdentifier: string) {
  const base = normalizeBaseUrl(apiBase);
  return [
    `export API_BASE=${shellEscape(base)}`,
    `export DEVICE_IDENTIFIER=${shellEscape(deviceIdentifier)}`,
    "curl -fsS -G \"$API_BASE/api/v1/learner-app/bootstrap\" \\",
    "  --data-urlencode \"deviceIdentifier=$DEVICE_IDENTIFIER\" \\",
    "  -H 'Accept: application/json'",
  ].join('\n');
}

function buildAndroidSigningEnvTemplate() {
  return [
    '# Required for flutter build apk --release',
    'export LUMO_ANDROID_STORE_FILE=/absolute/path/to/release-keystore.jks',
    'export LUMO_ANDROID_STORE_PASSWORD=replace-with-real-store-password',
    'export LUMO_ANDROID_KEY_ALIAS=replace-with-real-key-alias',
    'export LUMO_ANDROID_KEY_PASSWORD=replace-with-real-key-password',
    '',
    '# Or provide the same values in android/key.properties',
  ].join('\n');
}

function normalizeDeviceIdentifier(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function normalizePodIdentifier(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function getDeploymentBlockingReasons(
  registration: DeviceRegistration,
  duplicateScopeCount: number,
  duplicateDeviceIdentifierCount: number,
) {
  const reasons: string[] = [];
  const normalizedStatus = String(registration.status || '').trim().toLowerCase();

  if (!normalizeDeviceIdentifier(registration.deviceIdentifier)) {
    reasons.push('Device identifier is blank, so the dashboard cannot generate a trustworthy learner release bundle for this tablet yet.');
  }

  if (!normalizePodIdentifier(registration.podId)) {
    reasons.push('Pod ownership is missing, so geography and mallam handoff are not trustworthy yet.');
  }

  if (normalizedStatus !== 'active') {
    reasons.push(`Tablet status is ${registration.status || 'unknown'}, so ops should not ship a fresh learner build from this row.`);
  }

  if (normalizePodIdentifier(registration.podId) && duplicateScopeCount > 1) {
    reasons.push('This pod currently has multiple active tablets attached. Resolve the duplicate live device scope before provisioning another learner build.');
  }

  if (normalizeDeviceIdentifier(registration.deviceIdentifier) && duplicateDeviceIdentifierCount > 1) {
    reasons.push('This device identifier is duplicated across active tablet records. Fix the collision before copying any learner release env bundle from this dashboard.');
  }

  return reasons;
}

function describeTabletTarget(registration: DeviceRegistration) {
  return registration.deviceIdentifier || registration.tabletName || registration.id;
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
    const normalizedPodId = normalizePodIdentifier(registration.podId);
    if (!normalizedPodId || normalizedStatus !== 'active') return accumulator;
    accumulator[normalizedPodId] = (accumulator[normalizedPodId] || 0) + 1;
    return accumulator;
  }, {});
  const duplicateDeviceIdentifierCounts = registrations.reduce<Record<string, number>>((accumulator, registration) => {
    const normalizedStatus = String(registration.status || '').trim().toLowerCase();
    const normalizedIdentifier = normalizeDeviceIdentifier(registration.deviceIdentifier);
    if (!normalizedIdentifier || normalizedStatus !== 'active') return accumulator;
    accumulator[normalizedIdentifier] = (accumulator[normalizedIdentifier] || 0) + 1;
    return accumulator;
  }, {});
  const activePodCollisions = registrations.reduce<Record<string, string[]>>((accumulator, registration) => {
    const normalizedStatus = String(registration.status || '').trim().toLowerCase();
    const normalizedPodId = normalizePodIdentifier(registration.podId);
    if (!normalizedPodId || normalizedStatus !== 'active') return accumulator;
    accumulator[normalizedPodId] = [...(accumulator[normalizedPodId] || []), describeTabletTarget(registration)];
    return accumulator;
  }, {});
  const activeDeviceIdentifierCollisions = registrations.reduce<Record<string, string[]>>((accumulator, registration) => {
    const normalizedStatus = String(registration.status || '').trim().toLowerCase();
    const normalizedIdentifier = normalizeDeviceIdentifier(registration.deviceIdentifier);
    if (!normalizedIdentifier || normalizedStatus !== 'active') return accumulator;
    accumulator[normalizedIdentifier] = [...(accumulator[normalizedIdentifier] || []), describeTabletTarget(registration)];
    return accumulator;
  }, {});

  const prioritized = [...registrations]
    .map((registration) => {
      const deploymentBlockingReasons = getDeploymentBlockingReasons(
        registration,
        duplicateScopeCounts[normalizePodIdentifier(registration.podId)] || 0,
        duplicateDeviceIdentifierCounts[normalizeDeviceIdentifier(registration.deviceIdentifier)] || 0,
      );
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
      return (left.registration.deviceIdentifier || left.registration.tabletName || left.registration.id).localeCompare(
        right.registration.deviceIdentifier || right.registration.tabletName || right.registration.id,
      );
    });

  if (!prioritized.length) return null;

  const blockedRegistrations = prioritized.filter((entry) => !entry.rolloutReady);
  const readyRegistrations = prioritized.filter((entry) => entry.rolloutReady);
  const missingDeviceIdentifierCount = blockedRegistrations.filter((entry) => !normalizeDeviceIdentifier(entry.registration.deviceIdentifier)).length;
  const missingPodCount = blockedRegistrations.filter((entry) => !normalizePodIdentifier(entry.registration.podId)).length;
  const nonActiveCount = blockedRegistrations.filter((entry) => String(entry.registration.status || '').trim().toLowerCase() !== 'active').length;
  const duplicateScopePodCount = new Set(
    blockedRegistrations
      .filter((entry) => {
        const normalizedPodId = normalizePodIdentifier(entry.registration.podId);
        return normalizedPodId && (duplicateScopeCounts[normalizedPodId] || 0) > 1;
      })
      .map((entry) => normalizePodIdentifier(entry.registration.podId))
      .filter(Boolean),
  ).size;
  const duplicateDeviceIdentifierCount = new Set(
    blockedRegistrations
      .filter((entry) => {
        const normalizedIdentifier = normalizeDeviceIdentifier(entry.registration.deviceIdentifier);
        return normalizedIdentifier && (duplicateDeviceIdentifierCounts[normalizedIdentifier] || 0) > 1;
      })
      .map((entry) => normalizeDeviceIdentifier(entry.registration.deviceIdentifier))
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

      <div style={{ padding: '16px 18px', borderRadius: 18, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <strong style={{ color: '#1D4ED8', fontSize: 18 }}>Android release signing is a hard deployment blocker</strong>
          <div style={{ color: '#1D4ED8', lineHeight: 1.6 }}>
            <code>flutter build apk --release</code> will fail unless the learner app gets a real release keystore through <code>LUMO_ANDROID_STORE_FILE</code>, <code>LUMO_ANDROID_STORE_PASSWORD</code>, <code>LUMO_ANDROID_KEY_ALIAS</code>, and <code>LUMO_ANDROID_KEY_PASSWORD</code> or the matching <code>android/key.properties</code> file. A rollout bundle without signing is still not a deployable learner build.
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 14 }}>
          <CopyableTextCard eyebrow="Android release signing" title="Copy signing env template" text={buildAndroidSigningEnvTemplate()} tone="white" border="#BFDBFE" />
        </div>
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
            {missingDeviceIdentifierCount ? <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', color: '#9A3412', border: '1px solid #FDBA74', fontWeight: 700 }}>{missingDeviceIdentifierCount} blank device ID{missingDeviceIdentifierCount === 1 ? '' : 's'}</div> : null}
            {missingPodCount ? <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', color: '#9A3412', border: '1px solid #FDBA74', fontWeight: 700 }}>{missingPodCount} missing pod link{missingPodCount === 1 ? '' : 's'}</div> : null}
            {nonActiveCount ? <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', color: '#9A3412', border: '1px solid #FDBA74', fontWeight: 700 }}>{nonActiveCount} non-active tablet{nonActiveCount === 1 ? '' : 's'}</div> : null}
            {duplicateScopePodCount ? <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', color: '#9A3412', border: '1px solid #FDBA74', fontWeight: 700 }}>{duplicateScopePodCount} pod scope conflict{duplicateScopePodCount === 1 ? '' : 's'}</div> : null}
            {duplicateDeviceIdentifierCount ? <div style={{ padding: '8px 10px', borderRadius: 999, background: 'white', color: '#9A3412', border: '1px solid #FDBA74', fontWeight: 700 }}>{duplicateDeviceIdentifierCount} duplicate device ID{duplicateDeviceIdentifierCount === 1 ? '' : 's'}</div> : null}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 16 }}>
        {prioritized.map(({ registration, deploymentBlockingReasons, rolloutReady }) => {
          const tone = toneForStatus(registration.status);
          const geography = registration.stateName && registration.localGovernmentName
            ? `${registration.stateName} / ${registration.localGovernmentName}`
            : registration.centerName || registration.podLabel || 'Geography pending';
          const deviceLabel = registration.deviceIdentifier || registration.tabletName || 'Device identifier missing';
          const bootstrapProbe = buildBootstrapProbe(apiBase, registration.deviceIdentifier);
          const releaseWebCommand = buildReleaseCommand(apiBase, registration.deviceIdentifier, 'web');
          const releaseApkCommand = buildReleaseCommand(apiBase, registration.deviceIdentifier, 'apk');
          const bootstrapCurl = buildBootstrapCurl(apiBase, registration.deviceIdentifier);
          const normalizedPodId = normalizePodIdentifier(registration.podId);
          const podCollisionPeers = normalizedPodId
            ? (activePodCollisions[normalizedPodId] || []).filter((candidate) => candidate !== describeTabletTarget(registration))
            : [];
          const deviceIdentifierCollisionPeers = normalizeDeviceIdentifier(registration.deviceIdentifier)
            ? (activeDeviceIdentifierCollisions[normalizeDeviceIdentifier(registration.deviceIdentifier)] || [])
              .filter((candidate) => candidate !== describeTabletTarget(registration))
            : [];

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
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{deviceLabel}</div>
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
                  <CopyableTextCard eyebrow="Learner release build" title="Copy web provisioning command" text={releaseWebCommand} tone="white" border={tone.border} />
                  <CopyableTextCard eyebrow="Learner release build" title="Copy APK provisioning command" text={releaseApkCommand} tone="white" border={tone.border} />
                  <CopyableTextCard eyebrow="Bootstrap verification" title="Copy bootstrap probe" text={bootstrapProbe} tone="white" border={tone.border} />
                  <CopyableTextCard eyebrow="Bootstrap verification" title="Copy curl smoke test" text={bootstrapCurl} tone="white" border={tone.border} />
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {deploymentBlockingReasons.map((reason) => (
                      <div key={reason} style={{ padding: '12px 14px', borderRadius: 14, background: 'white', border: `1px solid ${tone.border}`, color: tone.accent, lineHeight: 1.6 }}>
                        {reason}
                      </div>
                    ))}
                  </div>
                  <div style={{ color: tone.accent, lineHeight: 1.6, fontWeight: 700 }}>
                    Keep the diagnostics copyable even while provisioning is blocked so ops can fix the exact tablet record instead of retyping device ids, bootstrap probes, or backend targets from screenshots.
                  </div>
                  {podCollisionPeers.length || deviceIdentifierCollisionPeers.length ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ color: tone.accent, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 800 }}>
                        Collision evidence
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {podCollisionPeers.map((peer) => (
                          <div key={`pod-peer-${registration.id}-${peer}`} style={{ padding: '8px 10px', borderRadius: 999, background: 'white', border: `1px solid ${tone.border}`, color: tone.accent, fontWeight: 700 }}>
                            Pod conflict: {peer}
                          </div>
                        ))}
                        {deviceIdentifierCollisionPeers.map((peer) => (
                          <div key={`device-peer-${registration.id}-${peer}`} style={{ padding: '8px 10px', borderRadius: 999, background: 'white', border: `1px solid ${tone.border}`, color: tone.accent, fontWeight: 700 }}>
                            Device ID collision: {peer}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 14 }}>
                    <CopyableTextCard eyebrow="Provisioning diagnostics" title="Copy device identifier" text={registration.deviceIdentifier || 'Unassigned device identifier'} tone="white" border={tone.border} />
                    <CopyableTextCard eyebrow="Provisioning diagnostics" title="Copy LMS API target" text={normalizeBaseUrl(apiBase)} tone="white" border={tone.border} />
                    {podCollisionPeers.length ? <CopyableTextCard eyebrow="Provisioning diagnostics" title="Copy pod collision peers" text={podCollisionPeers.join('\n')} tone="white" border={tone.border} /> : null}
                    {deviceIdentifierCollisionPeers.length ? <CopyableTextCard eyebrow="Provisioning diagnostics" title="Copy device ID collision peers" text={deviceIdentifierCollisionPeers.join('\n')} tone="white" border={tone.border} /> : null}
                    {normalizeDeviceIdentifier(registration.deviceIdentifier) ? (
                      <>
                        <CopyableTextCard eyebrow="Provisioning diagnostics" title="Copy bootstrap probe" text={bootstrapProbe} tone="white" border={tone.border} />
                        <CopyableTextCard eyebrow="Provisioning diagnostics" title="Copy curl smoke test" text={bootstrapCurl} tone="white" border={tone.border} />
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
