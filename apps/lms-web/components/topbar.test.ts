import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const topbarSource = readFileSync(fileURLToPath(new URL('./topbar.tsx', import.meta.url)), 'utf8');
const shellSource = readFileSync(fileURLToPath(new URL('./shell.tsx', import.meta.url)), 'utf8');
const pilotShellSource = readFileSync(fileURLToPath(new URL('../lib/pilot-shell.ts', import.meta.url)), 'utf8');

test('pilot shell warnings only render when the pilot control-plane shell is enabled', () => {
  assert.match(
    shellSource,
    /const pilotRoute = pilotControlPlaneEnabled \? describePilotShellRoute\(pathname\) : undefined;/,
    'app shell should only classify pilot shell routes when the override is enabled',
  );
  assert.match(
    topbarSource,
    /pilotControlPlaneEnabled && pilotRoute \?/,
    'topbar should gate pilot route warning chrome behind the override flag',
  );
  assert.match(
    topbarSource,
    /Full LMS shell live/,
    'topbar should still expose the full-shell chip when the full LMS shell is explicitly enabled',
  );
  assert.match(
    pilotShellSource,
    /outside the pilot shell/,
    'pilot shell helper should still explain off-shell routes for the override mode',
  );
});
