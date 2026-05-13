import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const lessonCreatePageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('lesson studio create route hard-blocks when production API wiring is unsafe', () => {
  assert.match(
    lessonCreatePageSource,
    /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/,
    'lesson studio create route should refuse to render against an unsafe production API target',
  );
  assert.match(
    lessonCreatePageSource,
    /Deployment blocker: lesson creation API base URL is unsafe for production\./,
    'lesson studio create route should call out the exact deployment blocker',
  );
  assert.match(
    lessonCreatePageSource,
    /NEXT_PUBLIC_API_BASE_URL/,
    'lesson studio create blocker should name the missing production env',
  );
});

test('lesson studio create route keeps the deeper blocker focused on missing authoring context after API trust passes', () => {
  assert.match(
    lessonCreatePageSource,
    /if \(!hasUsableAuthoringContext\)/,
    'lesson studio create route should keep the degraded authoring-context blocker for real feed loss',
  );
  assert.match(
    lessonCreatePageSource,
    /Deployment blocker: lesson authoring context could not be recovered\./,
    'lesson studio create route should preserve the deeper lesson-lane blocker after API trust succeeds',
  );
});

test('derived lesson-authoring subjects dedupe fallback module context with normalized ids and names', () => {
  assert.match(lessonCreatePageSource, /const derivedSubjectKeys = new Set<string>\(\);/);
  assert.match(lessonCreatePageSource, /const normalizedId = derived\.id\.trim\(\)\.toLowerCase\(\);/);
  assert.match(lessonCreatePageSource, /const normalizedName = derived\.name\.trim\(\)\.toLowerCase\(\);/);
  assert.match(lessonCreatePageSource, /if \(duplicateKeys\.some\(\(key\) => derivedSubjectKeys\.has\(key\)\)\) \{/);
  assert.match(lessonCreatePageSource, /duplicateKeys\.forEach\(\(key\) => derivedSubjectKeys\.add\(key\)\);/);
});

test('lesson create form remounts when launch context query changes so client navigation does not hydrate stale authoring state', () => {
  assert.match(lessonCreatePageSource, /const lessonCreateFormKey = \[/);
  assert.match(lessonCreatePageSource, /<LessonCreateForm\s+key=\{lessonCreateFormKey\}/);
  assert.match(lessonCreatePageSource, /duplicateLessonId \?\? ''/);
  assert.match(lessonCreatePageSource, /from,/);
});
