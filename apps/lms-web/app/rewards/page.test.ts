import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rewardsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('rewards route is blocked behind the pilot scope guard', () => {
  assert.match(rewardsPageSource, /PilotScopeBlocker/, 'rewards page should render the shared pilot blocker instead of a fake live control surface');
  assert.match(rewardsPageSource, /title="Rewards"/, 'rewards blocker should identify the route clearly');
  assert.match(rewardsPageSource, /that is garnish, not a control plane/, 'rewards blocker should explain why the route stays out of pilot nav');
});
