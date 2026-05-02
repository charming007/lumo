import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dashboardPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('dashboard does not hard-block on subject metadata degradation alone', () => {
  assert.doesNotMatch(
    dashboardPageSource,
    /subjectsResult\.status === 'rejected' \? 'subjects' : null/,
    'subject feed degradation alone should not be counted as a critical dashboard release blocker',
  );
  assert.match(
    dashboardPageSource,
    /releaseFeedsAvailable = modulesResult\.status === 'fulfilled' && lessonsResult\.status === 'fulfilled' && assessmentsResult\.status === 'fulfilled';/,
    'dashboard release snapshot should stay available when only subject metadata is degraded',
  );
  assert.match(
    dashboardPageSource,
    /Subject metadata is degraded, but the dashboard can still launch Lesson Studio when the module itself carries enough subject context to recover the authoring lane\./,
    'dashboard should surface subject metadata degradation as a warning instead of a hard blocker',
  );
});
