import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mallamDetailPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('mallam detail page hard-blocks when production API wiring is unsafe', () => {
  assert.match(mallamDetailPageSource, /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/, 'mallam detail page should block when the LMS API base is unsafe for production');
  assert.match(mallamDetailPageSource, /Deployment blocker: mallam detail API base URL is unsafe for production\./, 'mallam detail blocker should call out the exact deployment blocker');
  assert.match(mallamDetailPageSource, /NEXT_PUBLIC_API_BASE_URL/, 'mallam detail blocker should name the missing production env');
});

test('mallam detail page blocks instead of 404ing when the live facilitator feed is degraded', () => {
  assert.match(mallamDetailPageSource, /mallamsResult\.status === 'rejected'/, 'mallam detail page should explicitly detect mallam feed failure');
  assert.match(mallamDetailPageSource, /Deployment blocker: mallam detail feed is unavailable\./, 'mallam detail page should surface a degraded-feed blocker instead of falling through to notFound');
  assert.match(mallamDetailPageSource, /Treating a failed facilitator lookup as “mallam not found” would hide a live outage behind a fake 404\./, 'mallam detail page should explain why degraded feeds cannot masquerade as missing records');
});

test('mallam detail page blocks when staffing-reference feeds degrade instead of inviting blind edits', () => {
  assert.match(mallamDetailPageSource, /const criticalMallamDetailFailures = \[/, 'mallam detail page should isolate the core staffing-reference feeds that are too important to degrade into a polite warning');
  assert.match(mallamDetailPageSource, /if \(criticalMallamDetailFailures\.length\)/, 'mallam detail page should hard-block when the core staffing-reference feeds are down');
  assert.match(mallamDetailPageSource, /Deployment blocker: mallam detail staffing feeds are degraded\./, 'mallam detail page should use an explicit degraded-operations blocker headline');
  assert.match(mallamDetailPageSource, /Operators use this route to edit facilitator geography, update pod coverage, and manage roster ownership\./, 'mallam detail blocker should explain why facilitator detail becomes dangerous when reference feeds disappear');
  assert.match(mallamDetailPageSource, /Edit controls remain reachable while the staffing-reference graph is missing or stale/, 'mallam detail blocker should describe the unsafe write failure mode it prevents');
});
