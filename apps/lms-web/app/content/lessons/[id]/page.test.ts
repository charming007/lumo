import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const lessonEditorPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('lesson editor hard-blocks when production API wiring is unsafe', () => {
  assert.match(
    lessonEditorPageSource,
    /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\)/,
    'lesson editor should refuse to render against an unsafe production API target',
  );
  assert.match(
    lessonEditorPageSource,
    /Deployment blocker: lesson editor API base URL is unsafe for production\./,
    'lesson editor should call out the exact deployment blocker',
  );
  assert.match(
    lessonEditorPageSource,
    /NEXT_PUBLIC_API_BASE_URL/,
    'lesson editor blocker should name the missing production env',
  );
});

test('lesson editor blocks when the asset authoring feed is degraded', () => {
  assert.match(
    lessonEditorPageSource,
    /const criticalLessonEditorFailures = \[/,
    'lesson editor should isolate asset-registry failures that make media-backed edits unsafe',
  );
  assert.match(
    lessonEditorPageSource,
    /Deployment blocker: lesson asset authoring feeds are degraded\./,
    'lesson editor should hard-block when the live asset registry is blind',
  );
  assert.match(
    lessonEditorPageSource,
    /save a lesson that looks updated while its media graph is stale, incomplete, or broken\./,
    'lesson editor blocker should explain the unsafe media-reference failure mode it prevents',
  );
});

test('lesson editor still keeps the deeper blocker focused on unrecoverable lesson context after asset safety passes', () => {
  assert.match(
    lessonEditorPageSource,
    /if \(!lesson \|\| !hasUsableCurriculumContext\)/,
    'lesson editor should keep the degraded lesson-context blocker for real feed loss after asset safety is checked first',
  );
  assert.match(
    lessonEditorPageSource,
    /Deployment blocker: lesson editor context could not be recovered\./,
    'lesson editor should preserve the deeper lesson-context blocker after API trust succeeds',
  );
});
