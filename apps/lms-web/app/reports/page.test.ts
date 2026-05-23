import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const reportsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('reports route is blocked for pilot scope until wider evidence trust is ready', () => {
  assert.match(reportsPageSource, /import \{ PilotScopeBlocker \} from '\.\.\/\.\.\/components\/pilot-scope-blocker';/);
  assert.match(reportsPageSource, /title="Reports"/);
  assert.match(reportsPageSource, /this surface stays blocked/);
  assert.match(reportsPageSource, /Progress board/);
});
