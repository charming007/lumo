import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rewardsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('rewards route renders live admin surfaces instead of the pilot scope blocker', () => {
  assert.doesNotMatch(rewardsPageSource, /PilotScopeBlocker/);
  assert.match(rewardsPageSource, /RewardsAdminForm/);
  assert.match(rewardsPageSource, /RewardRequestQueuePanel/);
  assert.match(rewardsPageSource, /fetchRewardRequests/);
});
