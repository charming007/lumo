import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function routeSource(route: 'canvas' | 'english' | 'guide' | 'reports' | 'rewards') {
  return readFileSync(fileURLToPath(new URL(`./${route}/page.tsx`, import.meta.url)), 'utf8');
}

test('deferred specialist routes now share the pilot blocker instead of pretending they are live go-live surfaces', () => {
  for (const route of ['canvas', 'english', 'guide', 'reports', 'rewards'] as const) {
    const source = routeSource(route);
    assert.match(source, /PilotScopeBlocker/);
    assert.match(source, /Dashboard blocker stack/);
    assert.match(source, /Settings trust center/);
  }
});
