import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PILOT_BLOCKED_ROUTE_IDS,
  PILOT_BLOCKED_ROUTE_LABELS,
  PILOT_BLOCKED_ROUTES,
  PILOT_OFF_SHELL_ROUTE_IDS,
  PILOT_OFF_SHELL_ROUTE_LABELS,
  isPilotBlockedRoute,
} from './pilot-nav.ts';

test('pilot off-shell route list captures the specialist surfaces kept out of the sidebar without pretending they are all blocked', () => {
  assert.deepEqual(PILOT_OFF_SHELL_ROUTE_IDS, [
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
  assert.deepEqual(PILOT_OFF_SHELL_ROUTE_LABELS, [
    'Devices',
    'Curriculum Canvas',
    'English Studio',
    'Learners',
    'Mallams',
    'Pods',
    'Attendance',
    'Assessments',
    'Rewards',
    'Reports',
    'Guide',
  ]);
});

test('pilot blocked route list only names routes that still render a blocker page', () => {
  assert.deepEqual(PILOT_BLOCKED_ROUTES, [
    { id: 'english', label: 'English Studio' },
  ]);

  assert.deepEqual(PILOT_BLOCKED_ROUTE_IDS, PILOT_BLOCKED_ROUTES.map((route) => route.id));
  assert.deepEqual(PILOT_BLOCKED_ROUTE_LABELS, PILOT_BLOCKED_ROUTES.map((route) => route.label));
});

test('pilot blocked route helper only flags genuinely blocked specialist surfaces and leaves live routes alone', () => {
  for (const routeId of PILOT_BLOCKED_ROUTE_IDS) {
    assert.equal(isPilotBlockedRoute(routeId), true, `${routeId} should stay blocked in pilot nav`);
  }

  for (const routeId of ['dashboard', 'content', 'assignments', 'progress', 'settings', 'canvas', 'rewards', 'reports', 'guide']) {
    assert.equal(isPilotBlockedRoute(routeId), false, `${routeId} should stay live in pilot nav`);
  }
});
