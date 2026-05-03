import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./modal-launcher.tsx', import.meta.url)), 'utf8');

test('modal launcher tolerates nullable router hooks before composing a route signature', () => {
  assert.match(
    source,
    /const safePathname = pathname \|\| '';/,
    'usePathname can be null during pre-render or transitional router states, so modal launcher must tolerate it',
  );

  assert.match(
    source,
    /const query = searchParams\?\.toString\(\) \?\? '';/,
    'useSearchParams can be unavailable while the router is settling, so modal launcher must not call toString on null',
  );
});
