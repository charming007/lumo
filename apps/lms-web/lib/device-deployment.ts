import type { DeviceRegistration } from './types';

function getDuplicateScopeCounts(registrations: DeviceRegistration[]) {
  return registrations.reduce<Record<string, number>>((accumulator, registration) => {
    const normalizedStatus = String(registration.status || '').trim().toLowerCase();
    if (!registration.podId || normalizedStatus === 'retired') return accumulator;
    accumulator[registration.podId] = (accumulator[registration.podId] || 0) + 1;
    return accumulator;
  }, {});
}

function getDeploymentBlockingReasons(registration: DeviceRegistration, duplicateScopeCount: number) {
  const reasons: string[] = [];
  const normalizedStatus = String(registration.status || '').trim().toLowerCase();

  if (!registration.podId) reasons.push('missing-pod');
  if (normalizedStatus !== 'active') reasons.push('non-active-status');
  if (registration.podId && duplicateScopeCount > 1) reasons.push('duplicate-live-scope');

  return reasons;
}

export function getDeviceDeploymentReadiness(registrations: DeviceRegistration[]) {
  const duplicateScopeCounts = getDuplicateScopeCounts(registrations);
  const annotated = registrations.map((registration) => {
    const blockingReasons = getDeploymentBlockingReasons(registration, duplicateScopeCounts[registration.podId || ''] || 0);
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
