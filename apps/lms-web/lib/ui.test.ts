import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const uiSource = readFileSync(fileURLToPath(new URL('./ui.tsx', import.meta.url)), 'utf8');

test('SimpleTable keeps the desktop table layout until a true tablet/mobile breakpoint', () => {
  assert.match(
    uiSource,
    /@media \(max-width: 960px\)/,
    'shared admin tables should only collapse into stacked mobile cards at tablet/mobile widths',
  );
  assert.doesNotMatch(
    uiSource,
    /@media \(max-width: 1440px\)/,
    'using a 1440px cutoff collapses normal laptop and desktop admin tables into the mobile fallback UI',
  );
});
