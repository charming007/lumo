import assert from 'node:assert/strict';
import test from 'node:test';

import { describeDashboardStatus } from './trust-copy.ts';

test('describeDashboardStatus flags degraded runtime instead of claiming the live feed is connected', () => {
  assert.equal(
    describeDashboardStatus('degraded', 0),
    'Degraded mode — verify live LMS feeds before trusting this page',
  );
});

test('describeDashboardStatus flags offline runtime instead of claiming the live feed is connected', () => {
  assert.equal(
    describeDashboardStatus('offline', 0),
    'Offline mode — live LMS feed unavailable',
  );
});

test('describeDashboardStatus keeps the seeded-catalog warning visible when runtime is otherwise live', () => {
  assert.equal(
    describeDashboardStatus('live', 3),
    'Live LMS feed connected · seeded catalog still present',
  );
});

test('describeDashboardStatus keeps the clean live signal when runtime is healthy and unseeded', () => {
  assert.equal(describeDashboardStatus('live', 0), 'Live LMS feed connected');
});
