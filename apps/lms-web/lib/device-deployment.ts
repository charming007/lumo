import type { DeviceRegistration } from './types';

function normalizeDeviceIdentifier(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

function getDuplicateScopeCounts(registrations: DeviceRegistration[]) {
  return registrations.reduce<Record<string, number>>((accumulator, registration) => {
    const normalizedStatus = String(registration.status || '').trim().toLowerCase();
    if (!registration.podId || normalizedStatus !== 'active') return accumulator;
    accumulator[registration.podId] = (accumulator[registration.podId] || 0) + 1;
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
  if (!registration.podId) reasons.push('missing-pod');
  if (normalizedStatus !== 'active') reasons.push('non-active-status');
  if (registration.podId && duplicateScopeCount > 1) reasons.push('duplicate-live-scope');
  if (normalizeDeviceIdentifier(registration.deviceIdentifier) && duplicateDeviceIdentifierCount > 1) reasons.push('duplicate-device-identifier');

  return reasons;
}

export function getDeviceDeploymentReadiness(registrations: DeviceRegistration[]) {
  const duplicateScopeCounts = getDuplicateScopeCounts(registrations);
  const duplicateDeviceIdentifierCounts = getDuplicateDeviceIdentifierCounts(registrations);
  const annotated = registrations.map((registration) => {
    const blockingReasons = getDeploymentBlockingReasons(
      registration,
      duplicateScopeCounts[registration.podId || ''] || 0,
      duplicateDeviceIdentifierCounts[normalizeDeviceIdentifier(registration.deviceIdentifier)] || 0,
    );
    return {
      registration,
      blockingReasons,
      rolloutReady: blockingReasons.length === 0,
    };
  });

  return {
    annotated,
    hasRolloutReadyRegistration: annotated.some((entry) => entry.rolloutReady),
    rolloutReadyCount: annotated.filter((entry) => entry.rolloutReady).length,
    blockedCount: annotated.filter((entry) => !entry.rolloutReady).length,
  };
}
