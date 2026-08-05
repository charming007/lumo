import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const actionsSource = readFileSync(fileURLToPath(new URL('./actions.ts', import.meta.url)), 'utf8');

test('device update action patches rollout-critical identity fields', () => {
  assert.match(actionsSource, /const deviceIdentifier = String\(formData\.get\('deviceIdentifier'\) \|\| ''\)\.trim\(\);/, 'device update action should read the edited device identifier');
  assert.match(actionsSource, /const platform = String\(formData\.get\('platform'\) \|\| 'android'\)\.trim\(\);/, 'device update action should read the edited platform');
  assert.match(actionsSource, /if \(!deviceIdentifier\) \{[\s\S]*learner rollout handoff needs a real device identifier[\s\S]*\}/, 'device update action should reject blank device identifiers before saving');
  assert.match(actionsSource, /await apiWrite\(`\/api\/v1\/device-registrations\/\$\{registrationId\}`, 'PATCH', \{[\s\S]*deviceIdentifier,[\s\S]*platform: platform \|\| 'android',[\s\S]*\}, 'admin'\);/, 'device update action should patch deviceIdentifier and platform alongside pod, status, and app version');
});
