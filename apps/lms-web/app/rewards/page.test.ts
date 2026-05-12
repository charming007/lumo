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

test('rewards page hard-blocks when production API wiring is unsafe', () => {
  assert.match(rewardsPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'rewards page should block when the LMS API base is unsafe for production');
  assert.match(rewardsPageSource, /Deployment blocker: rewards API base URL is unsafe for production\./, 'rewards page should call out the exact deployment blocker');
  assert.match(rewardsPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'rewards blocker should name the missing production env');
});

test('rewards page still keeps degraded live recovery once production wiring is valid', () => {
  assert.match(rewardsPageSource, /Promise\.allSettled\(\[/, 'rewards page should use Promise.allSettled for feed recovery');
  assert.match(rewardsPageSource, /Rewards is running in degraded mode:/, 'rewards page should keep the operator-facing degraded-state banner');
  assert.match(rewardsPageSource, /Manual reward adjustment/, 'rewards page should keep the live manual-correction lane once production wiring is valid');
});
