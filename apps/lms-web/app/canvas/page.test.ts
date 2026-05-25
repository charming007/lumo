import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const canvasPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('canvas route is blocked for pilot scope and uses the shared blocker shell', () => {
  assert.match(canvasPageSource, /import \{ PilotScopeBlocker \} from '\.\.\/\.\.\/components\/pilot-scope-blocker';/);
  assert.match(canvasPageSource, /title="Curriculum Canvas"/);
  assert.match(canvasPageSource, /picked \/content as the only curriculum control plane/);
  assert.match(canvasPageSource, /Settings trust center/);
});
