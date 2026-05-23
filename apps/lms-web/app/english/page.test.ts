import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const englishPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('english studio is blocked for pilot scope and points operators back to content', () => {
  assert.match(englishPageSource, /import \{ PilotScopeBlocker \} from '\.\.\/\.\.\/components\/pilot-scope-blocker';/);
  assert.match(englishPageSource, /title="English Studio"/);
  assert.match(englishPageSource, /lesson authoring lives in \/content/);
  assert.match(englishPageSource, /Content library/);
});
