import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mallamDetailPageSource = readFileSync(fileURLToPath(new URL('./[id]/page.tsx', import.meta.url)), 'utf8');

test('mallam detail blocks when the learner roster feed degrades because roster manager depends on it', () => {
  assert.match(
    mallamDetailPageSource,
    /const criticalMallamDetailFailures = \[[\s\S]*studentsResult\.status === 'rejected' \? 'students' : null,[\s\S]*\]\.filter\(Boolean\) as string\[];/,
    'mallam detail should treat the live learner roster as a critical dependency, not optional supporting context',
  );
  assert.match(
    mallamDetailPageSource,
    /renders the live roster manager itself/,
    'mallam detail blocker should explain why a degraded student feed is deployment-blocking on this route',
  );
  assert.match(
    mallamDetailPageSource,
    /fake an empty or partial learner pool while still looking operational/,
    'mallam detail blocker should call out the exact quiet-failure mode it prevents',
  );
  assert.match(
    mallamDetailPageSource,
    /pod, and learner roster references all load before the facilitator detail form is trusted/,
    'mallam detail verification copy should require learner roster references before trusting the route',
  );
});
