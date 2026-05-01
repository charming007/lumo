import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldBlockDashboardPage } from './dashboard-blockers.ts';

test('blocks the dashboard when a critical dashboard feed fails', () => {
  assert.equal(shouldBlockDashboardPage({
    criticalDashboardFailureCount: 1,
    criticalReleaseFailureCount: 0,
    hasCriticalAssetOpsGap: false,
  }), true);
});

test('blocks the dashboard when release-readiness feeds fail', () => {
  assert.equal(shouldBlockDashboardPage({
    criticalDashboardFailureCount: 0,
    criticalReleaseFailureCount: 1,
    hasCriticalAssetOpsGap: false,
  }), true);
});

test('does not block the dashboard for subject metadata degradation alone when critical release feeds are still healthy', () => {
  assert.equal(shouldBlockDashboardPage({
    criticalDashboardFailureCount: 0,
    criticalReleaseFailureCount: 0,
    hasCriticalAssetOpsGap: false,
  }), false);
});

test('blocks the dashboard when asset operations are broken even if other feeds are healthy', () => {
  assert.equal(shouldBlockDashboardPage({
    criticalDashboardFailureCount: 0,
    criticalReleaseFailureCount: 0,
    hasCriticalAssetOpsGap: true,
  }), true);
});

test('does not block the dashboard when all critical feeds are healthy', () => {
  assert.equal(shouldBlockDashboardPage({
    criticalDashboardFailureCount: 0,
    criticalReleaseFailureCount: 0,
    hasCriticalAssetOpsGap: false,
  }), false);
});
