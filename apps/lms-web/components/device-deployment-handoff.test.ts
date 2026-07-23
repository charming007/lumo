import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./device-deployment-handoff.tsx', import.meta.url)), 'utf8');

test('device deployment handoff strips canonical learner API suffixes before generating rollout commands', () => {
  assert.match(
    source,
    /function stripKnownApiSuffix\(segments: string\[]\)/,
    'device deployment handoff should normalize LMS API targets before generating learner rollout commands',
  );

  assert.match(
    source,
    /\['api', 'v1', 'learner-app', 'bootstrap'\]/,
    'normalization should strip full learner bootstrap URLs back to the real API origin',
  );

  assert.match(
    source,
    /\['api', 'v1'\]/,
    'normalization should also strip pasted /api/v1 origins so bootstrap probes do not duplicate the path',
  );

  assert.doesNotMatch(
    source,
    /replace\(\/\\\/api\\\/v1\(\?:\\\/\.\*\)\?\\\/\+\$\/i, ''\)/,
    'normalization should not rely on the old trailing-slash regex because a pasted .../api/v1 URL would leak into rollout commands',
  );

  assert.match(
    source,
    /const normalizedSegments = segments\.map\(\(segment\) => segment\.toLowerCase\(\)\);/,
    'normalization should compare suffixes case-insensitively because operators paste mixed-case API URLs in the real world',
  );
});

test('device deployment handoff generates a shell-valid learner release command', () => {
  assert.match(
    source,
    /'cd apps\/learner-tablet &&'/,
    'release command should cd into the learner tablet app before chaining verification and build steps',
  );

  assert.match(
    source,
    /'dart run tool\/verify_release_config\.dart \\\\'/,
    'verification step should use line continuations on its own arguments instead of escaping the cd line',
  );

  assert.match(
    source,
    /\$\{buildCommand\} \\\\/,
    'build step should remain copyable as a multi-line command after verification succeeds',
  );

  assert.doesNotMatch(
    source,
    /\.join\(' \\\\\\\n'\)/,
    'release command should not join every line with a trailing backslash because that turns the copied shell into malformed syntax',
  );
});

test('device deployment handoff treats unsupported tablet platforms as rollout blockers instead of fake-ready bundles', () => {
  assert.match(
    source,
    /if \(reason === 'unsupported-platform'\)/,
    'handoff should explain why an unknown platform blocks provisioning',
  );

  assert.match(
    source,
    /Platform is \$\{platformLabel\(registration\.platform\)\}, so the dashboard cannot generate a trustworthy learner provisioning command for this tablet yet\./,
    'handoff should explicitly call out unsupported platform records as non-provisionable',
  );

  assert.match(
    source,
    /const unsupportedPlatformCount = blockedRegistrations\.filter\(\(entry\) => !\['android', 'ios', 'web'\]\.includes\(normalizePlatform\(entry\.registration\.platform\)\)\)\.length;/,
    'handoff should summarize unsupported platform blockers alongside missing IDs and pod issues',
  );

  assert.match(
    source,
    /unsupportedPlatformCount \? <div[\s\S]*unsupported platform\{unsupportedPlatformCount === 1 \? '' : 's'\}/,
    'handoff blocker chips should surface unsupported platform counts to operators',
  );
});
