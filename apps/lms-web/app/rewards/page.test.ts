import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rewardsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('rewards page stays behind the pilot availability blocker by default', () => {
  assert.match(rewardsPageSource, /getPilotBlockedRoute\('\/rewards'\)/, 'rewards should check pilot scope before rendering the heavy admin surface');
  assert.match(rewardsPageSource, /RouteAvailabilityBlocker/, 'rewards should render the shared route blocker when the page is deferred');
});

test('rewards page still keeps the live admin implementation behind the blocker', () => {
  assert.match(rewardsPageSource, /Promise\.allSettled\(\[/, 'rewards page should keep its live feed recovery logic for full-admin mode');
  assert.match(rewardsPageSource, /Top learners, with actual detail/, 'rewards page should preserve learner rewards UX when full-admin mode is intentionally enabled');
  assert.match(rewardsPageSource, /Admin reward correction tools/, 'rewards page should keep manual admin tools available behind the blocker');
  assert.match(rewardsPageSource, /fetchRewardsReport\(20\)/, 'rewards page should still hydrate richer rewards analytics in full-admin mode');
});
