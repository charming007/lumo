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
