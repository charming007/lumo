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

test('mallams page still keeps outage-safe degraded recovery once production wiring is valid', () => {
  assert.match(mallamsPageSource, /Promise\.allSettled\(\[/, 'mallams page should use Promise.allSettled for roster recovery');
  assert.match(mallamsPageSource, /const failedSources = \[/, 'mallams page should surface failed feed labels');
  assert.match(mallamsPageSource, /Mallam admin is degraded because the/, 'mallams page should keep the core-roster outage banner');
  assert.match(mallamsPageSource, /Mallam admin recovered with degraded feeds:/, 'mallams page should keep the degraded support-feed banner');
});
