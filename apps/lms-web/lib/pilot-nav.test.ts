import test from 'node:test';
import assert from 'node:assert/strict';

import { PILOT_BLOCKED_ROUTE_IDS, isPilotBlockedRoute } from './pilot-nav.ts';

test('pilot blocked route list captures the specialist surfaces kept out of the shell', () => {
  assert.deepEqual(PILOT_BLOCKED_ROUTE_IDS, [
    'devices',
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
  ]);
});

test('pilot blocked route helper flags specialist surfaces and leaves core routes alone', () => {
  for (const routeId of PILOT_BLOCKED_ROUTE_IDS) {
    assert.equal(isPilotBlockedRoute(routeId), true, `${routeId} should stay blocked in pilot nav`);
  }

  for (const routeId of ['dashboard', 'content', 'assignments', 'progress', 'settings']) {
    assert.equal(isPilotBlockedRoute(routeId), false, `${routeId} should stay live in pilot nav`);
  }
});
