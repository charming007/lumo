import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const topbarSource = readFileSync(fileURLToPath(new URL('./topbar.tsx', import.meta.url)), 'utf8');
const shellSource = readFileSync(fileURLToPath(new URL('./shell.tsx', import.meta.url)), 'utf8');
const pilotShellSource = readFileSync(fileURLToPath(new URL('../lib/pilot-shell.ts', import.meta.url)), 'utf8');

test('pilot shell warnings only render when the pilot control-plane override or shell-scope blocker is active', () => {
  assert.match(
    shellSource,
    /const effectivePilotControlPlaneEnabled = pilotControlPlaneEnabled \|\| shellScopeDeploymentBlocked;/,
    'app shell should clamp shared chrome to the pilot shell when a production shell blocker is active',
  );
  assert.match(
    shellSource,
    /const pilotRoute = effectivePilotControlPlaneEnabled \? describePilotShellRoute\(pathname\) : undefined;/,
    'app shell should classify pilot shell routes from the effective clamped shell state',
  );
  assert.match(
    topbarSource,
    /pilotControlPlaneEnabled && pilotRoute \?/,
    'topbar should gate pilot route warning chrome behind the override flag',
  );
  assert.match(
    topbarSource,
    /Full LMS shell live/,
    'topbar should expose the full-shell chip in default mode',
  );
  assert.match(
    pilotShellSource,
    /outside the pilot shell/,
    'pilot shell helper should still explain off-shell routes for the override mode',
  );
});
