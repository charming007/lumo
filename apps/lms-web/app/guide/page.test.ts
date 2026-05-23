import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const guidePageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('guide route is blocked for pilot scope instead of widening the shipped shell', () => {
  assert.match(guidePageSource, /import \{ PilotScopeBlocker \} from '\.\.\/\.\.\/components\/pilot-scope-blocker';/);
  assert.match(guidePageSource, /title="Guide"/);
  assert.match(guidePageSource, /route broadens pilot scope/);
  assert.match(guidePageSource, /Dashboard blocker stack/);
});
