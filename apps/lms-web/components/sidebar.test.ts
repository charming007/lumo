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
  assert.match(source, /Pilot control plane for curriculum readiness and learner progress/);
  assert.match(source, /Pilot-ready routes/);
  assert.match(source, /Dashboard, content, assignments, progress, and settings are visible for pilot go-live/);
  assert.match(source, /Education operations/);
  assert.match(source, /Learners, facilitators, pods, devices, curriculum, assessment, assignments, and reporting in one focused shell/);
  assert.match(source, /All admin routes stay available; this redesign only changes presentation\./);
  assert.doesNotMatch(source, /forcing operators through the pilot-only control-plane chrome/);
});

test('sidebar closes the mobile sheet on route changes even if the open flag lags behind the navigation commit', () => {
  assert.match(
    source,
    /if \(previousPathnameRef\.current !== safePathname\) \{\s*onCloseMobileNav\?\.\(\);/,
    'route transitions should always trigger the close callback so the mobile overlay cannot stay stuck over the next screen',
  );

  assert.doesNotMatch(
    source,
    /if \(previousPathnameRef\.current !== safePathname && mobileNavOpen\)/,
    'gating the close callback behind the stale mobileNavOpen prop can leave the mobile sheet covering the newly selected route',
  );
});
