import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./sidebar.tsx', import.meta.url)), 'utf8');

test('sidebar normalizes nullable pathname values before active-path checks', () => {
  assert.match(
    source,
    /const safePathname = pathname \|\| '';/,
    'usePathname can be null while the app router is settling, so sidebar navigation must guard it before comparing paths',
  );

  assert.match(
    source,
    /isActivePath\(safePathname, item.href\)/,
    'active-nav checks must use the normalized pathname instead of the raw nullable hook result',
  );
});
