import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const topbarSource = readFileSync(fileURLToPath(new URL('./topbar.tsx', import.meta.url)), 'utf8');
const shellSource = readFileSync(fileURLToPath(new URL('./shell.tsx', import.meta.url)), 'utf8');
const pilotShellSource = readFileSync(fileURLToPath(new URL('../lib/pilot-shell.ts', import.meta.url)), 'utf8');

test('pilot shell warns when a direct route is outside the visible pilot nav', () => {
  assert.match(
    shellSource,
    /const pilotRoute = describePilotShellRoute\(pathname\);/,
    'app shell should classify the current route so the shell can tell the truth about scope',
  );
  assert.match(
    pilotShellSource,
    /eyebrow: 'Specialist route'/,
    'pilot shell helper should classify off-shell routes as specialist surfaces',
  );
  assert.match(
    pilotShellSource,
    /outside the pilot shell/,
    'pilot shell helper should say plainly when the current route is live but outside the pilot shell',
  );
  assert.match(
    pilotShellSource,
    /Do not treat this page as proof that the wider LMS surface is pilot-approved just because it renders behind the same chrome\./,
    'pilot shell helper should warn reviewers not to mistake shared chrome for pilot approval',
  );
  assert.match(
    topbarSource,
    /pilotRoute\.title/,
    'topbar should actually render the classified route warning copy in the shell chrome',
  );
});
