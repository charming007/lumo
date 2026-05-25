import test from 'node:test';
import assert from 'node:assert/strict';

import { describePilotShellRoute } from './pilot-shell.ts';

test('pilot shell helper classifies visible shell routes as in-scope', () => {
  assert.deepEqual(describePilotShellRoute('/progress'), {
    routeId: 'progress',
    routeLabel: 'Progress',
    status: 'visible',
    eyebrow: 'Pilot route',
    title: 'Progress is inside the visible pilot shell.',
    detail: 'This route is one of the operator surfaces the sidebar intentionally exposes for pilot go-live.',
  });
});

test('pilot shell helper classifies explicitly deferred specialist routes as blocked instead of pilot-approved', () => {
  assert.deepEqual(describePilotShellRoute('/reports/weekly'), {
    routeId: 'reports',
    routeLabel: 'Reports',
    status: 'blocked',
    eyebrow: 'Blocked surface',
    title: 'Reports is explicitly blocked for pilot use.',
    detail: 'If this route is open at all, treat it as a blocker surface rather than a deployment-ready operator workflow.',
  });
});

test('pilot shell helper keeps unknown routes out of the pilot-safe bucket', () => {
  assert.deepEqual(describePilotShellRoute('/weird/internal-page'), {
    routeId: 'weird',
    routeLabel: 'weird',
    status: 'unknown',
    eyebrow: 'Unclassified route',
    title: 'This route is not part of the named pilot shell.',
    detail: 'If someone is using it during deployment review, they should verify scope first instead of assuming the shell makes it pilot-safe.',
  });
});
