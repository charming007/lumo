import test from 'node:test';
import assert from 'node:assert/strict';

import { navigationItems } from './navigation.ts';

test('devices navigation item is restored as a live admin route', () => {
  const devicesItem = navigationItems.find((item) => item.id === 'devices');

  assert.ok(devicesItem, 'expected devices navigation item to exist');
  assert.equal(devicesItem?.href, '/devices');
  assert.equal(devicesItem?.availability, undefined);
  assert.equal(devicesItem?.availabilityLabel, undefined);
});

test('live navigation routes do not inherit the deferred pilot marker', () => {
  const liveRouteIds = ['dashboard', 'content', 'devices', 'assignments', 'progress', 'settings'];

  for (const routeId of liveRouteIds) {
    const item = navigationItems.find((entry) => entry.id === routeId);

    assert.ok(item, `expected ${routeId} navigation item to exist`);
    assert.equal(item?.availability, undefined);
    assert.equal(item?.availabilityLabel, undefined);
  }
});
