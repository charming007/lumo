import test from 'node:test';
import assert from 'node:assert/strict';

import { navigationItems } from './navigation.ts';
import { redirectIfPilotHiddenRoute } from './pilot-nav.ts';

test('full admin navigation still knows the complete LMS route set', () => {
  const expectedRoutes = [
    ['dashboard', '/'],
    ['content', '/content'],
    ['assignments', '/assignments'],
    ['progress', '/progress'],
    ['devices', '/devices'],
    ['settings', '/settings'],
    ['canvas', '/canvas'],
    ['english', '/english'],
    ['students', '/students'],
    ['mallams', '/mallams'],
    ['pods', '/pods'],
    ['attendance', '/attendance'],
    ['assessments', '/assessments'],
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

test('full admin navigation stays visible in the live shell', () => {
  assert.deepEqual(
    navigationItems.map((item) => item.id),
    [
      'dashboard',
      'content',
      'assignments',
      'progress',
      'devices',
      'settings',
      'canvas',
      'english',
      'students',
      'mallams',
      'pods',
      'attendance',
      'assessments',
      'rewards',
      'reports',
      'guide',
    ],
  );
});

test('retired pilot redirects do not hide full-admin routes anymore', () => {
  for (const pathname of ['/canvas', '/english', '/reports', '/rewards', '/guide']) {
    assert.doesNotThrow(() => redirectIfPilotHiddenRoute(pathname));
    assert.deepEqual(redirectIfPilotHiddenRoute(pathname), {});
  }
});
