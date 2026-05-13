import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const englishPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('english studio hard-blocks when production API wiring is unsafe', () => {
  assert.match(englishPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'english studio should block when the LMS API base is unsafe for production');
  assert.match(englishPageSource, /Deployment blocker: English Studio API base URL is unsafe for production\./, 'english studio should call out the exact deployment blocker');
  assert.match(englishPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'english studio blocker should name the missing production env');
});

test('english studio still blocks only when the curriculum lane itself is missing after API trust passes', () => {
  assert.match(englishPageSource, /if \(!englishSubject \|\| !englishModules.length\)/, 'english studio should keep the curriculum-lane blocker for real feed loss');
  assert.match(englishPageSource, /Blocking here is correct only when the curriculum lane itself is missing/, 'english studio should explain that the deeper blocker is the curriculum lane, not leftover pilot copy');
});
