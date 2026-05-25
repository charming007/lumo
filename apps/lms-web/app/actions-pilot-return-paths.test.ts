import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const actionsSource = readFileSync(fileURLToPath(new URL('./actions.ts', import.meta.url)), 'utf8');
const rewardsAdminFormSource = readFileSync(fileURLToPath(new URL('../components/rewards-admin-form.tsx', import.meta.url)), 'utf8');
const rewardQueuePanelSource = readFileSync(fileURLToPath(new URL('../components/reward-request-queue-panel.tsx', import.meta.url)), 'utf8');

test('pilot-safe action fallbacks do not dump operators into blocked canvas or rewards routes', () => {
  assert.doesNotMatch(
    actionsSource,
    /sanitizeReturnPath\(String\(formData\.get\('returnPath'\) \|\| ''\), '\/(canvas|rewards)'\)/,
    'shared LMS actions should not default successful writes back into pilot-blocked routes',
  );
  assert.doesNotMatch(
    actionsSource,
    /redirect\('\/(rewards|reports)\?message=/,
    'reward-side server actions should not redirect operators into blocked rewards or reports pages',
  );
});

test('reward operator forms pin their fallback handoff to settings', () => {
  assert.match(
    rewardsAdminFormSource,
    /name="returnPath" value="\/settings"/,
    'reward admin forms should carry an explicit pilot-safe return path',
  );
  assert.match(
    rewardQueuePanelSource,
    /name="returnPath" value="\/settings"/,
    'reward queue actions should carry an explicit pilot-safe return path',
  );
});
