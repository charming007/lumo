import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { fullNavigationItems, getNavigationItems, pilotNavigationItems } from './navigation.ts';

const topbarSource = readFileSync(fileURLToPath(new URL('../components/topbar.tsx', import.meta.url)), 'utf8');

test('full admin navigation remains available when the full shell is explicitly enabled', () => {
  assert.deepEqual(
    fullNavigationItems.map((item) => [item.id, item.href]),
    [
      ['dashboard', '/'],
      ['students', '/students'],
      ['mallams', '/mallams'],
      ['pods', '/pods'],
      ['devices', '/devices'],
      ['attendance', '/attendance'],
      ['content', '/content'],
      ['english', '/english'],
      ['canvas', '/canvas'],
      ['assessments', '/assessments'],
      ['assignments', '/assignments'],
      ['progress', '/progress'],
      ['rewards', '/rewards'],
      ['reports', '/reports'],
      ['guide', '/guide'],
      ['settings', '/settings'],
    ],
  );
  assert.deepEqual(getNavigationItems(false), fullNavigationItems);
});

test('pilot navigation remains the default control-plane shell', () => {
  assert.deepEqual(
    pilotNavigationItems.map((item) => [item.id, item.href]),
    [
      ['dashboard', '/'],
      ['content', '/content'],
      ['assignments', '/assignments'],
      ['progress', '/progress'],
      ['settings', '/settings'],
    ],
  );
  assert.deepEqual(getNavigationItems(true), pilotNavigationItems);
});

test('topbar keeps both full-shell and pilot-shell copy available', () => {
  assert.match(topbarSource, /Lumo LMS admin/);
  assert.match(topbarSource, /Full LMS shell live/);
  assert.match(topbarSource, /Lumo command center/);
  assert.match(topbarSource, /Pilot nav locked/);
  assert.match(topbarSource, /Outside pilot shell/);
  assert.match(topbarSource, /Blocked pilot surface/);
});
