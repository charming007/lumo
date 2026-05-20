import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { navigationItems } from './navigation.ts';

const topbarSource = readFileSync(fileURLToPath(new URL('../components/topbar.tsx', import.meta.url)), 'utf8');

test('admin navigation keeps the visible pilot shell limited to the routes operators should actually trust at go-live', () => {
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

test('topbar copy tells the truth about the pilot shell instead of implying the full LMS nav is live', () => {
  assert.match(topbarSource, /Lumo command center/);
  assert.match(topbarSource, /Pilot nav locked/);
  assert.match(topbarSource, /Outside pilot shell/);
  assert.match(topbarSource, /Blocked pilot surface/);
  assert.match(topbarSource, /data-route-scope-chip=\{pilotRoute\.status\}/);
  assert.doesNotMatch(topbarSource, /Full LMS shell live/);
});
