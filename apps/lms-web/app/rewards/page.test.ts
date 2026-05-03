import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rewardsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('rewards page degrades instead of hard-failing on a single feed outage', () => {
  assert.match(rewardsPageSource, /Promise\.allSettled\(\[/, 'rewards page should use Promise.allSettled for feed recovery');
  assert.match(rewardsPageSource, /const failedSources = \[/, 'rewards page should surface failed feed labels');
  assert.match(rewardsPageSource, /Rewards admin is degraded because/, 'rewards page should show an operator-facing degraded-state banner');
});

test('rewards page no longer carries the retired pilot redirect shim', () => {
  assert.doesNotMatch(rewardsPageSource, /redirectIfPilotHiddenRoute\('\/rewards'\)/, 'rewards should render in the full admin shell instead of redirecting to progress');
});

test('rewards page leads with learner dashboard UX and keeps admin tools secondary', () => {
  assert.match(rewardsPageSource, /Top learners, with actual detail/, 'rewards page should foreground learner rewards exploration');
  assert.match(rewardsPageSource, /Admin reward correction tools/, 'rewards page should keep manual admin tools in a secondary section');
  assert.match(rewardsPageSource, /fetchRewardsReport\(20\)/, 'rewards page should hydrate richer rewards analytics for charts and breakdowns');
});
