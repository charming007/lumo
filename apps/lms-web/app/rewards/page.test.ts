import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rewardsPageSource = readFileSync(resolve('apps/lms-web/app/rewards/page.tsx'), 'utf8');

test('rewards page degrades instead of hard-failing on a single feed outage', () => {
  assert.match(rewardsPageSource, /Promise\.allSettled\(\[/, 'rewards page should use Promise.allSettled for feed recovery');
  assert.match(rewardsPageSource, /const failedSources = \[/, 'rewards page should surface failed feed labels');
  assert.match(rewardsPageSource, /Rewards admin is degraded because/, 'rewards page should show an operator-facing degraded-state banner');
});
