import test from 'node:test';
import assert from 'node:assert/strict';

import { PILOT_BLOCKED_ROUTE_IDS, PILOT_BLOCKED_ROUTE_LABELS, PILOT_BLOCKED_ROUTES, isPilotBlockedRoute } from './pilot-nav.ts';

test('pilot blocked route list captures the specialist surfaces kept out of the shell', () => {
  assert.deepEqual(PILOT_BLOCKED_ROUTES, [
    { id: 'devices', label: 'Devices' },
    { id: 'canvas', label: 'Curriculum Canvas' },
    { id: 'english', label: 'English Studio' },
    { id: 'students', label: 'Learners' },
    { id: 'mallams', label: 'Mallams' },
    { id: 'pods', label: 'Pods' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'rewards', label: 'Rewards' },
    { id: 'reports', label: 'Reports' },
    { id: 'guide', label: 'Guide' },
  ]);

  assert.deepEqual(PILOT_BLOCKED_ROUTE_IDS, PILOT_BLOCKED_ROUTES.map((route) => route.id));
  assert.deepEqual(PILOT_BLOCKED_ROUTE_LABELS, PILOT_BLOCKED_ROUTES.map((route) => route.label));
});

test('pilot blocked route helper flags specialist surfaces and leaves core routes alone', () => {
  for (const routeId of PILOT_BLOCKED_ROUTE_IDS) {
    assert.equal(isPilotBlockedRoute(routeId), true, `${routeId} should stay blocked in pilot nav`);
  }

  for (const routeId of ['dashboard', 'content', 'assignments', 'progress', 'settings']) {
    assert.equal(isPilotBlockedRoute(routeId), false, `${routeId} should stay live in pilot nav`);
  }
});
