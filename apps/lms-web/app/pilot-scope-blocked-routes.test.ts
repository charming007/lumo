import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function routeSource(route: string) {
  return readFileSync(fileURLToPath(new URL(`./${route}/page.tsx`, import.meta.url)), 'utf8');
}

test('deferred pilot routes render the shared pilot scope blocker instead of pretending they are go-live surfaces', () => {
  for (const [route, title, rationaleSnippet] of [
    ['canvas', 'Curriculum Canvas', 'picked /content as the only curriculum control plane'],
    ['english', 'English Studio', 'lesson authoring lives in /content'],
    ['rewards', 'Rewards', 'not part of the pilot-safe control plane'],
    ['reports', 'Reports', 'this surface stays blocked'],
    ['guide', 'Guide', 'this route broadens pilot scope'],
  ] as const) {
    const source = routeSource(route);
    assert.match(source, /import \{ PilotScopeBlocker \} from '\.\.\/\.\.\/components\/pilot-scope-blocker';/, `${route} should use the shared pilot scope blocker component`);
    assert.match(source, /return \(\s*<PilotScopeBlocker/s, `${route} should return the blocker immediately during pilot deployment review`);
    assert.match(source, new RegExp(`title=\"${title.replace(/ /g, '\\s+')}`), `${route} blocker should name the exact deferred route`);
    assert.match(source, new RegExp(rationaleSnippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${route} blocker should explain why the surface is deferred for pilot scope`);
  }
});
