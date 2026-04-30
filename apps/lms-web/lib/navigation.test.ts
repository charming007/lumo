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

test('pilot-deferred routes stay visibly marked so operators do not treat them as core control planes', () => {
  const deferredRoutes = [
    ['canvas', 'Internal only'],
    ['english', 'Internal only'],
    ['students', 'Back office'],
    ['mallams', 'Back office'],
    ['pods', 'Back office'],
    ['attendance', 'Back office'],
    ['assessments', 'Back office'],
    ['rewards', 'Post-pilot'],
    ['reports', 'Post-pilot'],
    ['guide', 'Docs only'],
  ] as const;

  for (const [routeId, availabilityLabel] of deferredRoutes) {
    const item = navigationItems.find((entry) => entry.id === routeId);

    assert.ok(item, `expected ${routeId} navigation item to exist`);
    assert.equal(item?.availability, 'deferred');
    assert.equal(item?.availabilityLabel, availabilityLabel);
  }
});
