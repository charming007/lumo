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

test('sidebar keeps pilot copy behind the override and restores normal LMS shell copy by default', () => {
  assert.match(source, /Pilot control plane for dashboard triage/);
  assert.match(source, /Keep the visible nav brutally honest/);
  assert.match(source, /This sidebar only shows the routes operators should trust for pilot go-live/);
  assert.match(source, /Run the full LMS admin shell/);
  assert.match(source, /This sidebar gives operators the full LMS route map/);
  assert.match(source, /Use this shell to move across the real admin routes, verify live data, and manage day-to-day LMS operations\./);
  assert.doesNotMatch(source, /forcing operators through the pilot-only control-plane chrome/);
});
