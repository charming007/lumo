import test from 'node:test';
import assert from 'node:assert/strict';

import { navigationItems, pilotNavigationItems, pilotRestrictedRouteIds, isPilotRestrictedPath } from './navigation.ts';

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

test('pilot navigation strips deferred admin surfaces from the visible shell', () => {
  const visibleRouteIds = pilotNavigationItems.map((item) => item.id);

  assert.deepEqual(visibleRouteIds, [
    'dashboard',
    'content',
    'assignments',
    'progress',
    'settings',
  ]);

  for (const routeId of ['canvas', 'english', 'rewards', 'reports', 'guide']) {
    assert.equal(visibleRouteIds.includes(routeId), false, `${routeId} should be hidden from the pilot shell`);
    assert.equal(pilotRestrictedRouteIds.has(routeId), true, `${routeId} should be treated as pilot restricted`);
  }

  assert.equal(isPilotRestrictedPath('/canvas'), true);
  assert.equal(isPilotRestrictedPath('/reports'), true);
  assert.equal(isPilotRestrictedPath('/content'), false);
});
