import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rewardsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('rewards route is blocked for pilot scope and does not pretend reward ops are go-live safe', () => {
  assert.match(rewardsPageSource, /import \{ PilotScopeBlocker \} from '\.\.\/\.\.\/components\/pilot-scope-blocker';/);
  assert.match(rewardsPageSource, /title="Rewards"/);
  assert.match(rewardsPageSource, /not part of the pilot-safe control plane/);
  assert.match(rewardsPageSource, /Assignments board/);
});
