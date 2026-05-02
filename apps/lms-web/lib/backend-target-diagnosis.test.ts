import test from 'node:test';
import assert from 'node:assert/strict';

import { diagnoseBackendTargetMismatch } from './backend-target-diagnosis.ts';

test('detects likely stale or wrong backend when multiple feed failures look like route mismatches', () => {
  const diagnosis = diagnoseBackendTargetMismatch([
    {
      label: 'modules',
      error: {
        status: 404,
        diagnostic: {
          routeMismatchLikely: true,
          requestUrl: 'https://lumo-api-production-303a.up.railway.app/api/v1/curriculum/modules',
        },
      },
    },
    {
      label: 'asset runtime',
      error: {
        status: 404,
        diagnostic: {
          routeMismatchLikely: true,
          requestUrl: 'https://lumo-api-production-303a.up.railway.app/api/v1/admin/assets/runtime',
        },
      },
    },
  ]);

  assert.deepEqual(diagnosis, {
    kind: 'likely-stale-or-wrong-backend',
    failingFeeds: ['modules', 'asset runtime'],
    requestUrls: [
      'https://lumo-api-production-303a.up.railway.app/api/v1/curriculum/modules',
      'https://lumo-api-production-303a.up.railway.app/api/v1/admin/assets/runtime',
    ],
  });
});

test('does not over-diagnose normal outages as a stale backend', () => {
  const diagnosis = diagnoseBackendTargetMismatch([
    {
      label: 'dashboard summary',
      error: {
        status: 500,
        diagnostic: {
          routeMismatchLikely: false,
          requestUrl: 'https://lumo-api-production-303a.up.railway.app/api/v1/dashboard/summary',
        },
      },
    },
    {
      label: 'workboard',
      error: new Error('socket hang up'),
    },
  ]);

  assert.equal(diagnosis, null);
});
