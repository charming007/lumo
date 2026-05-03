import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pilotNavSource = readFileSync(fileURLToPath(new URL('./pilot-nav.ts', import.meta.url)), 'utf8');

test('pilot hidden route map no longer redirects live reports and rewards pages', () => {
  assert.doesNotMatch(pilotNavSource, /'\/reports':\s*'\//, 'reports should stay live in the admin shell');
  assert.doesNotMatch(pilotNavSource, /'\/rewards':\s*'\/progress'/, 'rewards should stay live in the admin shell');
});

test('pilot hidden route map is fully retired for deferred surfaces too', () => {
  assert.doesNotMatch(pilotNavSource, /'\/canvas':\s*'\/content'/);
  assert.doesNotMatch(pilotNavSource, /'\/english':\s*'\/content'/);
  assert.doesNotMatch(pilotNavSource, /'\/guide':\s*'\/settings'/);
});
