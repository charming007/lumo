import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mallamsPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('mallams page hard-blocks when production API wiring is unsafe', () => {
  assert.match(mallamsPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'mallams page should block when the LMS API base is unsafe for production');
  assert.match(mallamsPageSource, /Deployment blocker: mallams API base URL is unsafe for production\./, 'mallams page should call out the exact deployment blocker');
  assert.match(mallamsPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'mallams blocker should name the missing production env');
});

test('mallams page blocks when core staffing-reference feeds degrade instead of inviting blind writes', () => {
  assert.match(mallamsPageSource, /const criticalMallamFailures = \[/, 'mallams page should isolate the core staffing feeds that are too important to degrade into a polite warning');
  assert.match(mallamsPageSource, /if \(criticalMallamFailures\.length\)/, 'mallams page should hard-block when the core staffing-reference feeds are down');
  assert.match(mallamsPageSource, /Deployment blocker: mallam staffing feeds are degraded\./, 'mallams page should use an explicit degraded-operations blocker headline');
  assert.match(mallamsPageSource, /Operators use this route to create facilitators, reassign primary pod ownership, and maintain live staffing coverage\./, 'mallams blocker should explain why facilitator admin becomes dangerous when reference feeds disappear');
  assert.match(mallamsPageSource, /Forms stay interactive while the core staffing references are missing or stale/, 'mallams blocker should describe the unsafe write failure mode it prevents');
});

test('mallams page still allows learner-count context to degrade separately once staffing references recover', () => {
  assert.match(mallamsPageSource, /const failedSources = \[/, 'mallams page should continue tracking all degraded feeds for operator copy');
  assert.match(mallamsPageSource, /Additional degraded feed/, 'mallams blocker should still call out secondary degradation separately');
  assert.match(mallamsPageSource, /Mallam admin recovered with degraded feeds:/, 'mallams page should keep the degraded support-feed banner for non-critical context loss');
});
