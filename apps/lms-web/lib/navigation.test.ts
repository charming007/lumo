import test from 'node:test';
import assert from 'node:assert/strict';

import { navigationItems } from './navigation.ts';

test('full admin navigation exposes the complete LMS route set', () => {
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
