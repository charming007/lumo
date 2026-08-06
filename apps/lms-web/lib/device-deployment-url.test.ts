import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDeviceBootstrapCurl,
  buildDeviceBootstrapProbe,
  buildDeviceReleaseCommand,
  normalizeDeploymentApiBase,
} from './device-deployment-url.ts';

test('normalizeDeploymentApiBase strips api suffixes without requiring a trailing slash', () => {
  assert.equal(
    normalizeDeploymentApiBase('https://lumo.example.com/api/v1'),
    'https://lumo.example.com',
  );
  assert.equal(
    normalizeDeploymentApiBase('https://lumo.example.com/api/v1/learner-app'),
    'https://lumo.example.com',
  );
  assert.equal(
    normalizeDeploymentApiBase('https://lumo.example.com/api/v1/learner-app/bootstrap'),
    'https://lumo.example.com',
  );
});

test('bootstrap probe never duplicates the api path when the configured LMS base already includes /api/v1', () => {
  assert.equal(
    buildDeviceBootstrapProbe('https://lumo.example.com/api/v1', 'tablet-01'),
    'https://lumo.example.com/api/v1/learner-app/bootstrap?deviceIdentifier=tablet-01',
  );
});

test('release command keeps learner tablet builds pinned to the host root even when config includes /api/v1', () => {
  const command = buildDeviceReleaseCommand('https://lumo.example.com/api/v1', 'tablet-01', 'apk');
  assert.match(command, /--dart-define=LUMO_API_BASE_URL='https:\/\/lumo\.example\.com'/);
  assert.doesNotMatch(command, /api\/v1\/api\/v1/);
});

test('bootstrap curl exports the normalized API host once for rollout diagnostics', () => {
  const command = buildDeviceBootstrapCurl('https://lumo.example.com/api/v1', 'tablet-01');
  assert.match(command, /export API_BASE='https:\/\/lumo\.example\.com'/);
  assert.match(command, /curl -fsS -G "\$API_BASE\/api\/v1\/learner-app\/bootstrap"/);
  assert.doesNotMatch(command, /api\/v1\/api\/v1/);
});
