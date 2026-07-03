import type { DeviceRegistration } from './types';

function normalizeDeviceIdentifier(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function normalizePodIdentifier(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function getDuplicateScopeCounts(registrations: DeviceRegistration[]) {
  return registrations.reduce<Record<string, number>>((accumulator, registration) => {
    const normalizedStatus = String(registration.status || '').trim().toLowerCase();
    const normalizedPodId = normalizePodIdentifier(registration.podId);
    if (!normalizedPodId || normalizedStatus !== 'active') return accumulator;
    accumulator[normalizedPodId] = (accumulator[normalizedPodId] || 0) + 1;
    return accumulator;
  }, {});
}

function getDuplicateDeviceIdentifierCounts(registrations: DeviceRegistration[]) {
  return registrations.reduce<Record<string, number>>((accumulator, registration) => {
    const normalizedStatus = String(registration.status || '').trim().toLowerCase();
    const normalizedIdentifier = normalizeDeviceIdentifier(registration.deviceIdentifier);
    if (!normalizedIdentifier || normalizedStatus !== 'active') return accumulator;
    accumulator[normalizedIdentifier] = (accumulator[normalizedIdentifier] || 0) + 1;
    return accumulator;
  }, {});
}

function getDeploymentBlockingReasons(
  registration: DeviceRegistration,
  duplicateScopeCount: number,
  duplicateDeviceIdentifierCount: number,
) {
  const reasons: string[] = [];
  const normalizedStatus = String(registration.status || '').trim().toLowerCase();

  if (!normalizeDeviceIdentifier(registration.deviceIdentifier)) reasons.push('missing-device-identifier');
  if (!normalizePodIdentifier(registration.podId)) reasons.push('missing-pod');
  if (normalizedStatus !== 'active') reasons.push('non-active-status');
  if (normalizePodIdentifier(registration.podId) && duplicateScopeCount > 1) reasons.push('duplicate-live-scope');
  if (normalizeDeviceIdentifier(registration.deviceIdentifier) && duplicateDeviceIdentifierCount > 1) reasons.push('duplicate-device-identifier');

  return reasons;
}

export function getDeviceDeploymentReadiness(registrations: DeviceRegistration[]) {
  const duplicateScopeCounts = getDuplicateScopeCounts(registrations);
  const duplicateDeviceIdentifierCounts = getDuplicateDeviceIdentifierCounts(registrations);
  const annotated = registrations.map((registration) => {
    const blockingReasons = getDeploymentBlockingReasons(
      registration,
      duplicateScopeCounts[normalizePodIdentifier(registration.podId)] || 0,
      duplicateDeviceIdentifierCounts[normalizeDeviceIdentifier(registration.deviceIdentifier)] || 0,
    );
    return {
      registration,
      blockingReasons,
      rolloutReady: blockingReasons.length === 0,
    };
  });
  const blockingReasonLabels: Record<string, string> = {
    'missing-device-identifier': 'missing device ID',
    'missing-pod': 'missing pod owner',
    'non-active-status': 'inactive tablet status',
    'duplicate-live-scope': 'duplicate live pod scope',
    'duplicate-device-identifier': 'duplicate device ID',
  };
  const blockingReasonCounts = annotated.reduce<Record<string, number>>((accumulator, entry) => {
    if (entry.rolloutReady) return accumulator;
    entry.blockingReasons.forEach((reason) => {
      accumulator[reason] = (accumulator[reason] || 0) + 1;
    });
    return accumulator;
  }, {});
  const blockingSummary = Object.entries(blockingReasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      label: blockingReasonLabels[reason] ?? reason,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

  return {
    annotated,
    blockingSummary,
    hasRolloutReadyRegistration: annotated.some((entry) => entry.rolloutReady),
    rolloutReadyCount: annotated.filter((entry) => entry.rolloutReady).length,
    blockedCount: annotated.filter((entry) => !entry.rolloutReady).length,
  };
}
