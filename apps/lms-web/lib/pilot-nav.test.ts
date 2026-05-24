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

test('pilot off-shell route list captures only the live specialist surfaces kept out of the sidebar', () => {
  assert.deepEqual(PILOT_OFF_SHELL_ROUTE_IDS, [
    'devices',
    'students',
    'mallams',
    'pods',
    'attendance',
    'assessments',
  ]);
  assert.deepEqual(PILOT_OFF_SHELL_ROUTE_LABELS, [
    'Devices',
    'Learners',
    'Mallams',
    'Pods',
    'Attendance',
    'Assessments',
  ]);

  for (const routeId of PILOT_BLOCKED_ROUTE_IDS) {
    assert.equal(PILOT_OFF_SHELL_ROUTE_IDS.includes(routeId), false, `${routeId} should not be advertised as a live off-shell route once pilot scope blocks it`);
  }
});

test('pilot blocked route list names the explicitly deferred pilot surfaces that should render blocker pages', () => {
  assert.deepEqual(PILOT_BLOCKED_ROUTES, [
    { id: 'canvas', label: 'Curriculum Canvas' },
    { id: 'english', label: 'English Studio' },
    { id: 'rewards', label: 'Rewards' },
    { id: 'reports', label: 'Reports' },
    { id: 'guide', label: 'Guide' },
  ]);

  assert.deepEqual(PILOT_BLOCKED_ROUTE_IDS, PILOT_BLOCKED_ROUTES.map((route) => route.id));
  assert.deepEqual(PILOT_BLOCKED_ROUTE_LABELS, PILOT_BLOCKED_ROUTES.map((route) => route.label));
});

test('pilot blocked route helper only flags genuinely blocked specialist surfaces and leaves approved pilot routes alone', () => {
  for (const routeId of PILOT_BLOCKED_ROUTE_IDS) {
    assert.equal(isPilotBlockedRoute(routeId), true, `${routeId} should stay blocked in pilot nav`);
  }

  for (const routeId of ['dashboard', 'content', 'assignments', 'progress', 'settings', 'devices', 'students', 'mallams', 'pods', 'attendance', 'assessments']) {
    assert.equal(isPilotBlockedRoute(routeId), false, `${routeId} should stay live in pilot nav`);
  }
});
