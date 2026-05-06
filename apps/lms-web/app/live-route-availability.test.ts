import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function routeSource(route: 'canvas' | 'guide' | 'reports' | 'rewards') {
  return readFileSync(fileURLToPath(new URL(`./${route}/page.tsx`, import.meta.url)), 'utf8');
}

test('canvas route renders the live curriculum canvas instead of the pilot blocker', () => {
  const source = routeSource('canvas');
  assert.doesNotMatch(source, /PilotScopeBlocker/);
  assert.match(source, /CurriculumCanvas/);
  assert.match(source, /buildCurriculumCanvasData/);
  assert.match(source, /fetchCurriculumCanvasTree/);
});

test('rewards route renders live rewards admin surfaces instead of the pilot blocker', () => {
  const source = routeSource('rewards');
  assert.doesNotMatch(source, /PilotScopeBlocker/);
  assert.match(source, /RewardsAdminForm/);
  assert.match(source, /RewardRequestQueuePanel/);
  assert.match(source, /fetchRewardRequests/);
});

test('reports route renders live reports data instead of the pilot blocker', () => {
  const source = routeSource('reports');
  assert.doesNotMatch(source, /PilotScopeBlocker/);
  assert.match(source, /fetchReportsOverview/);
  assert.match(source, /fetchRewardsReport/);
  assert.match(source, /fetchOperationsReport/);
});

test('guide route exposes shipped guide assets instead of the pilot blocker', () => {
  const source = routeSource('guide');
  assert.doesNotMatch(source, /PilotScopeBlocker/);
  assert.match(source, /LMS_DASHBOARD_GUIDE\.html/);
  assert.match(source, /DEPLOY_VERIFICATION_CHECKLIST\.html/);
  assert.match(source, /Live guide surfaces/);
});
