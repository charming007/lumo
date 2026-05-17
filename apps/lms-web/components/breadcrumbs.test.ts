import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./breadcrumbs.tsx', import.meta.url)), 'utf8');

test('breadcrumbs tolerate nullable pathname values before deriving segments', () => {
  assert.match(
    source,
    /const safePathname = pathname \|\| '';/,
    'usePathname can be null during pre-render or router transitions, so breadcrumbs must normalize it before splitting',
  );

  assert.match(
    source,
    /const derivedItems = safePathname/,
    'breadcrumb derivation must use the normalized pathname instead of calling split on a nullable value',
  );
});
