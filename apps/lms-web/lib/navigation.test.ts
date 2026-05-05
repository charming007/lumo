import test from 'node:test';
import assert from 'node:assert/strict';

import { navigationItems } from './navigation.ts';
import { PILOT_BLOCKED_ROUTE_IDS } from './pilot-nav.ts';

test('pilot navigation keeps only the trusted deployment routes in the live shell', () => {
  const expectedRoutes = [
    ['dashboard', '/'],
    ['content', '/content'],
    ['assignments', '/assignments'],
    ['progress', '/progress'],
    ['settings', '/settings'],
  ] as const;

  assert.deepEqual(
    navigationItems.map((item) => [item.id, item.href]),
    expectedRoutes,
  );

  for (const [routeId, href] of expectedRoutes) {
    const item = navigationItems.find((entry) => entry.id === routeId);

    assert.ok(item, `expected ${routeId} navigation item to exist`);
    assert.equal(item?.href, href);
    assert.deepEqual(Object.keys(item ?? {}).sort(), ['href', 'id', 'label']);
  }
});

test('pilot navigation hides specialist routes from the primary shell', () => {
  for (const hiddenRoute of PILOT_BLOCKED_ROUTE_IDS) {
    assert.equal(
      navigationItems.some((item) => item.id === hiddenRoute),
      false,
      `${hiddenRoute} should stay out of the pilot sidebar`,
    );
  }
});
