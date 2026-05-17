import test from 'node:test';
import assert from 'node:assert/strict';
import { getPodAdminReferenceHealth } from './admin-reference-health.ts';

test('blocks pod admin when operational records exist but states are missing', () => {
  const result = getPodAdminReferenceHealth({
    pods: [{ id: 'pod-1' } as any],
    centers: [],
    mallams: [],
    states: [],
    localGovernments: [{ id: 'lga-1' } as any],
  });

  assert.equal(result.blocked, true);
  assert.deepEqual(result.missingReferences, ['states']);
});

test('blocks pod admin when operational records exist but local governments are missing', () => {
  const result = getPodAdminReferenceHealth({
    pods: [],
    centers: [{ id: 'center-1' } as any],
    mallams: [],
    states: [{ id: 'state-1' } as any],
    localGovernments: [],
  });

  assert.equal(result.blocked, true);
  assert.deepEqual(result.missingReferences, ['local governments']);
});

test('does not block pod admin for a genuinely empty deployment seed', () => {
  const result = getPodAdminReferenceHealth({
    pods: [],
    centers: [],
    mallams: [],
    states: [],
    localGovernments: [],
  });

  assert.equal(result.blocked, false);
  assert.deepEqual(result.missingReferences, []);
});

test('does not block pod admin when geography references are loaded', () => {
  const result = getPodAdminReferenceHealth({
    pods: [{ id: 'pod-1' } as any],
    centers: [{ id: 'center-1' } as any],
    mallams: [{ id: 'mallam-1' } as any],
    states: [{ id: 'state-1' } as any],
    localGovernments: [{ id: 'lga-1' } as any],
  });

  assert.equal(result.blocked, false);
  assert.deepEqual(result.missingReferences, []);
});
