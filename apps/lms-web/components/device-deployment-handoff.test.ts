import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./device-deployment-handoff.tsx', import.meta.url)), 'utf8');

test('device deployment handoff strips any nested /api/v1 path before generating rollout commands', () => {
  assert.match(
    source,
    /withScheme\.replace\(/,
    'device deployment handoff should normalize LMS API targets before generating learner rollout commands',
  );

  assert.match(
    source,
    /\/api\\\/v1\(\?:\\\/\.\*\)\?\\\/\+\$\/i/,
    'normalization should strip arbitrary nested /api/v1 dashboard or admin paths so rollout bundles keep the real API origin',
  );

  assert.doesNotMatch(
    source,
    /dashboard\(\?:\\\/\[a-z-\]\+\)\?\|admin\\\/\[a-z-\]\+\(\?:\\\/\[a-z-\]\+\)\?/,
    'normalization should not rely on a short allowlist of dashboard/admin suffixes because deeper live API paths would leak into rollout commands',
  );
});
