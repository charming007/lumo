import test from 'node:test';
import assert from 'node:assert/strict';

import { getDeviceDeploymentReadiness } from './device-deployment.ts';
import type { DeviceRegistration } from './types.ts';

function makeRegistration(overrides: Partial<DeviceRegistration>): DeviceRegistration {
  return {
    id: overrides.id ?? 'registration-1',
    podId: overrides.podId ?? 'pod-alpha',
    deviceIdentifier: overrides.deviceIdentifier ?? 'tablet-01',
    platform: overrides.platform ?? 'android',
    status: overrides.status ?? 'active',
    ...overrides,
  };
}

test('rollout readiness treats pod scope collisions as duplicates even when pod ids drift by case or whitespace', () => {
  const readiness = getDeviceDeploymentReadiness([
    makeRegistration({ id: 'one', podId: 'pod-alpha', deviceIdentifier: 'tablet-01' }),
    makeRegistration({ id: 'two', podId: '  POD-ALPHA  ', deviceIdentifier: 'tablet-02' }),
  ]);

  assert.equal(readiness.hasRolloutReadyRegistration, false);
  assert.equal(readiness.rolloutReadyCount, 0);
  assert.equal(readiness.hasDuplicateLiveScope, true);
  assert.equal(readiness.duplicateLiveScopeCount, 2);
  assert.deepEqual(
    readiness.annotated.map((entry) => entry.blockingReasons.includes('duplicate-live-scope')),
    [true, true],
  );
});

test('rollout readiness treats blank pod ids as missing after trimming whitespace', () => {
  const readiness = getDeviceDeploymentReadiness([
    makeRegistration({ id: 'blank-pod', podId: '   ', deviceIdentifier: 'tablet-03' }),
  ]);

  assert.equal(readiness.hasRolloutReadyRegistration, false);
  assert.deepEqual(readiness.annotated[0]?.blockingReasons, ['missing-pod']);
});

test('rollout readiness exposes duplicate active device identifiers for dashboard hard-blocking', () => {
  const readiness = getDeviceDeploymentReadiness([
    makeRegistration({ id: 'one', podId: 'pod-alpha', deviceIdentifier: 'tablet-dup' }),
    makeRegistration({ id: 'two', podId: 'pod-beta', deviceIdentifier: '  TABLET-DUP  ' }),
  ]);

  assert.equal(readiness.hasRolloutReadyRegistration, false);
  assert.equal(readiness.hasDuplicateDeviceIdentifiers, true);
  assert.equal(readiness.duplicateDeviceIdentifierCount, 2);
  assert.deepEqual(
    readiness.annotated.map((entry) => entry.blockingReasons.includes('duplicate-device-identifier')),
    [true, true],
  );
});

test('rollout readiness blocks blank or unsupported tablet platforms because handoff commands would be fiction', () => {
  const blankPlatform = getDeviceDeploymentReadiness([
    makeRegistration({ id: 'blank-platform', platform: '   ' }),
  ]);
  const unsupportedPlatform = getDeviceDeploymentReadiness([
    makeRegistration({ id: 'windows-tablet', platform: 'Windows' }),
  ]);
  const iosAlias = getDeviceDeploymentReadiness([
    makeRegistration({ id: 'ipad', platform: 'iPad OS' }),
  ]);

  assert.deepEqual(blankPlatform.annotated[0]?.blockingReasons, ['unsupported-platform']);
  assert.deepEqual(unsupportedPlatform.annotated[0]?.blockingReasons, ['unsupported-platform']);
  assert.equal(unsupportedPlatform.hasRolloutReadyRegistration, false);
  assert.equal(iosAlias.annotated[0]?.blockingReasons.length, 0);
  assert.equal(iosAlias.hasRolloutReadyRegistration, true);
});
