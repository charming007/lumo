import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { navigationItems } from './navigation.ts';

const topbarSource = readFileSync(fileURLToPath(new URL('../components/topbar.tsx', import.meta.url)), 'utf8');

test('admin navigation exposes the full LMS shell routes that are live in production', () => {
  const expectedRoutes = [
    ['dashboard', '/'],
    ['content', '/content'],
    ['assignments', '/assignments'],
    ['progress', '/progress'],
    ['devices', '/devices'],
    ['settings', '/settings'],
    ['canvas', '/canvas'],
    ['english', '/english'],
    ['students', '/students'],
    ['mallams', '/mallams'],
    ['pods', '/pods'],
    ['attendance', '/attendance'],
    ['assessments', '/assessments'],
    ['rewards', '/rewards'],
    ['reports', '/reports'],
    ['guide', '/guide'],
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

test('topbar copy reflects the normal full LMS shell instead of the admin control-plane wording', () => {
  assert.match(topbarSource, /Lumo command center/);
  assert.match(topbarSource, /Full LMS shell live/);
  assert.doesNotMatch(topbarSource, /Lumo admin control plane/);
});
