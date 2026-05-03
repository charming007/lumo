import test from 'node:test';
import assert from 'node:assert/strict';

import { navigationItems } from './navigation.ts';
import { getPilotBlockedRoute, pilotNavMode, redirectIfPilotHiddenRoute, visibleNavigationItems } from './pilot-nav.ts';

test('navigation catalog still knows the complete LMS route inventory', () => {
  const expectedRoutes = [
    ['dashboard', '/'],
    ['content', '/content'],
    ['assignments', '/assignments'],
    ['progress', '/progress'],
    ['settings', '/settings'],
    ['devices', '/devices'],
    ['students', '/students'],
    ['mallams', '/mallams'],
    ['pods', '/pods'],
    ['attendance', '/attendance'],
    ['assessments', '/assessments'],
    ['canvas', '/canvas'],
    ['english', '/english'],
    ['rewards', '/rewards'],
    ['reports', '/reports'],
    ['guide', '/guide'],
  ] as const;

  for (const [routeId, href] of expectedRoutes) {
    const item = navigationItems.find((entry) => entry.id === routeId);

    assert.ok(item, `expected ${routeId} navigation item to exist`);
    assert.equal(item?.href, href);
    assert.deepEqual(Object.keys(item ?? {}).sort(), ['href', 'id', 'label']);
  }
});

test('default pilot shell trims deferred routes from visible navigation', () => {
  assert.equal(pilotNavMode, 'pilot-trimmed');
  assert.deepEqual(
    visibleNavigationItems.map((item) => item.id),
    ['dashboard', 'content', 'assignments', 'progress', 'settings', 'devices', 'students', 'mallams', 'pods', 'attendance', 'assessments'],
  );
});

test('deferred pilot routes resolve to availability blockers instead of pretending they are live', () => {
  for (const pathname of ['/canvas', '/english', '/rewards', '/reports', '/guide']) {
    const blocked = getPilotBlockedRoute(pathname);
    assert.ok(blocked, `expected ${pathname} to be blocked in pilot mode`);
    assert.equal(blocked?.href, pathname);
    assert.deepEqual(redirectIfPilotHiddenRoute(pathname), blocked);
  }
});

test('core pilot routes remain available', () => {
  for (const pathname of ['/', '/content', '/assignments', '/progress', '/settings', '/attendance', '/mallams']) {
    assert.equal(getPilotBlockedRoute(pathname), null);
    assert.deepEqual(redirectIfPilotHiddenRoute(pathname), {});
  }
});
