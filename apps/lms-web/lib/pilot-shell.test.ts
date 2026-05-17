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

test('pilot shell helper classifies direct specialist routes as off-shell instead of pilot-approved', () => {
  assert.deepEqual(describePilotShellRoute('/reports/weekly'), {
    routeId: 'reports',
    routeLabel: 'Reports',
    status: 'off-shell',
    eyebrow: 'Specialist route',
    title: 'Reports is live but outside the pilot shell.',
    detail: 'Do not treat this page as proof that the wider LMS surface is pilot-approved just because it renders behind the same chrome.',
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
