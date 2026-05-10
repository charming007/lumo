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

test('sidebar copy keeps the visible shell honest about pilot scope', () => {
  assert.match(source, /Pilot control plane for dashboard triage/);
  assert.match(source, /Keep the visible nav brutally honest/);
  assert.match(source, /This sidebar only shows the routes operators should trust for pilot go-live/);
  assert.doesNotMatch(source, /Full LMS admin shell for curriculum, assignments, learner progress, devices, staffing, reporting, and day-to-day operations\./);
});
