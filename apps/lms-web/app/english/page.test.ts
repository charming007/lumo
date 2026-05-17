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

test('english studio blocks when critical authoring feeds degrade, not just when the curriculum lane disappears', () => {
  assert.match(englishPageSource, /const criticalEnglishStudioFailures = \[/, 'english studio should explicitly track critical authoring feed failures');
  assert.match(englishPageSource, /assessmentsResult\.status === 'rejected' \? 'assessments' : null/, 'english studio should treat assessments as a critical authoring dependency');
  assert.match(englishPageSource, /assetsResult\.status === 'rejected' \? 'assets' : null/, 'english studio should treat assets as a critical authoring dependency');
  assert.match(englishPageSource, /if \(criticalEnglishStudioFailures\.length \|\| missingEnglishLane\)/, 'english studio should hard-block when critical authoring feeds degrade or the curriculum lane is missing');
  assert.match(englishPageSource, /Deployment blocker: English Studio authoring feeds are degraded\./, 'english studio should call out degraded authoring feeds as a deployment blocker');
  assert.match(englishPageSource, /If the assessments or assets feed is down, operators can still create lessons that look finished while the readiness gate or media payload is blind\./, 'english studio blocker should explain why assets and assessments are not safe to treat as optional here');
  assert.doesNotMatch(englishPageSource, /English Studio recovered with degraded feeds:[\s\S]*Core English authoring stays live because the curriculum lane is available/, 'english studio should stop pretending the route is safe to keep interactive when critical authoring feeds are degraded');
});
