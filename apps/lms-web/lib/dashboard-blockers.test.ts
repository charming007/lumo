import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldBlockDashboardPage } from './dashboard-blockers.ts';

const healthy = {
  criticalDashboardFailureCount: 0,
  criticalReleaseFailureCount: 0,
  hasCriticalAssetOpsGap: false,
  hasEmptyReleaseBoard: false,
  hasDeviceDeploymentGap: false,
  hasReleaseGraphMismatch: false,
};

test('blocks the dashboard when a critical dashboard feed fails', () => {
  assert.equal(shouldBlockDashboardPage({ ...healthy, criticalDashboardFailureCount: 1 }), true);
});

test('blocks the dashboard when release-readiness feeds fail', () => {
  assert.equal(shouldBlockDashboardPage({ ...healthy, criticalReleaseFailureCount: 1 }), true);
});

test('does not block the dashboard for subject metadata degradation alone when critical release feeds are still healthy', () => {
  assert.equal(shouldBlockDashboardPage(healthy), false);
});

test('blocks the dashboard when asset operations are broken even if other feeds are healthy', () => {
  assert.equal(shouldBlockDashboardPage({ ...healthy, hasCriticalAssetOpsGap: true }), true);
});

test('blocks the dashboard when release-readiness feeds resolve cleanly but return an empty curriculum board', () => {
  assert.equal(shouldBlockDashboardPage({ ...healthy, hasEmptyReleaseBoard: true }), true);
});

test('blocks the dashboard when learner deployment handoff is blind or has no rollout-ready tablet', () => {
  assert.equal(shouldBlockDashboardPage({ ...healthy, hasDeviceDeploymentGap: true }), true);
});

test('blocks the dashboard when release feeds resolve but the curriculum graph is internally contradictory', () => {
  assert.equal(shouldBlockDashboardPage({ ...healthy, hasReleaseGraphMismatch: true }), true);
});

test('does not block the dashboard when all critical feeds are healthy', () => {
  assert.equal(shouldBlockDashboardPage(healthy), false);
});
