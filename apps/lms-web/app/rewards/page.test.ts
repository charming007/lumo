import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rewardsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('rewards route hard-blocks when production API wiring is unsafe', () => {
  assert.match(rewardsPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'rewards route should block when the LMS API base is unsafe for production');
  assert.match(rewardsPageSource, /Deployment blocker: rewards API base URL is unsafe for production\./, 'rewards route should call out the exact deployment blocker');
  assert.match(rewardsPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'rewards blocker should name the missing production env');
  assert.match(rewardsPageSource, /fake points and queue state are not harmless fluff/, 'rewards blocker should explain why silent fallback is unsafe');
});

test('rewards route blocks when core reward-operation feeds degrade instead of showing fake calm', () => {
  assert.match(rewardsPageSource, /const criticalRewardFailures = \[/, 'rewards should isolate the core feeds that are too important to degrade into a polite warning');
  assert.match(rewardsPageSource, /catalogResult\.status === 'rejected' \? 'rewards catalog' : null/, 'rewards should treat the live rewards catalog as a deployment-blocking reference feed');
  assert.match(rewardsPageSource, /if \(criticalRewardFailures\.length\)/, 'rewards should hard-block when the core reward-operation feeds are down');
  assert.match(rewardsPageSource, /Deployment blocker: reward operations feeds are degraded\./, 'rewards should use an explicit degraded-operations blocker headline');
  assert.match(rewardsPageSource, /Operators use this route to review live reward demand, approve fulfillment work, and make manual XP corrections\./, 'rewards blocker should explain why this route becomes dangerous when core feeds disappear');
  assert.match(rewardsPageSource, /The rewards catalog is part of the live reference graph here, not decorative garnish\./, 'rewards blocker should explain why catalog loss is now treated as a control-surface blocker');
  assert.match(rewardsPageSource, /Correction flows stay interactive while the learner, rewards catalog, or queue context is missing or stale/, 'rewards blocker should describe the unsafe write failure mode it prevents');
});

test('rewards route still tracks degraded feeds for blocker detail and warning copy', () => {
  assert.match(rewardsPageSource, /const failedSources = \[/, 'rewards should continue tracking all degraded feeds for operator copy');
  assert.match(rewardsPageSource, /Additional degraded feed/, 'rewards blocker should still call out secondary degradation separately');
  assert.match(rewardsPageSource, /Rewards is running in degraded mode:/, 'rewards page should still surface degraded-mode copy when any non-blocking secondary warning remains');
});
