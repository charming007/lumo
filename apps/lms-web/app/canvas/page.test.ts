import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const canvasPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('canvas blocks when the production API target is missing or unsafe', () => {
  assert.match(
    canvasPageSource,
    /import \{ API_BASE_DIAGNOSTIC \} from '\.\.\/\.\.\/lib\/config';/,
    'canvas page should read the shared production API diagnostic instead of inventing its own trust rules',
  );
  assert.match(
    canvasPageSource,
    /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\) \{/,
    'canvas should block before rendering a live-looking graph when the LMS is not wired to a production-safe API target',
  );
  assert.match(
    canvasPageSource,
    /title="Curriculum Canvas"/,
    'canvas blocker should identify the exact route that is being withheld',
  );
  assert.match(
    canvasPageSource,
    /NEXT_PUBLIC_API_BASE_URL/,
    'canvas blocker should explain that broken production API wiring is the reason the route is withheld',
  );
});

test('canvas hard-blocks when core authoring feeds degrade', () => {
  assert.match(
    canvasPageSource,
    /const criticalCanvasFailures = \[/,
    'canvas should identify the curriculum feeds that are too important to degrade into a warning banner',
  );
  assert.match(
    canvasPageSource,
    /subjectsResult\.status === 'rejected' \? 'subjects' : null/,
    'canvas should treat subject feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /strandsResult\.status === 'rejected' \? 'strands' : null/,
    'canvas should treat strand feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /modulesResult\.status === 'rejected' \? 'modules' : null/,
    'canvas should treat module feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /lessonsResult\.status === 'rejected' \? 'lessons' : null/,
    'canvas should treat lesson feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /assessmentsResult\.status === 'rejected' \? 'assessments' : null/,
    'canvas should treat assessment feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /if \(criticalCanvasFailures\.length\) \{/,
    'canvas should stop rendering interactive authoring controls when core curriculum feeds fail',
  );
  assert.match(
    canvasPageSource,
    /Deployment blocker: curriculum authoring feeds are degraded\./,
    'canvas should surface an explicit degraded-authoring blocker headline',
  );
  assert.match(
    canvasPageSource,
    /Leaving Canvas interactive here would let operators edit modules, lessons, strands, or assessment gates against a partial curriculum graph\./,
    'canvas should explain the unsafe write failure mode it prevents',
  );
  assert.match(
    canvasPageSource,
    /The fallback create-lesson CTA is only safe when the authoring feeds are healthy enough to trust the scoped context\./,
    'canvas blocker should call out why launching fallback authoring while degraded is unsafe',
  );
});

test('canvas fallback create-lesson CTA preserves scoped blocker subject and module context', () => {
  assert.match(
    canvasPageSource,
    /const requestedSubjectId = normalizeRouteParam\(query\?\.subject\)\.trim\(\);/,
    'canvas page should recover the scoped blocker subject from the incoming query before building fallback authoring links',
  );
  assert.match(
    canvasPageSource,
    /const requestedModuleId = normalizeRouteParam\(query\?\.module\)\.trim\(\);/,
    'canvas page should recover the scoped blocker module from the incoming query before building fallback authoring links',
  );
  assert.match(
    canvasPageSource,
    /const createLessonHref = `\/content\/lessons\/new\?\$\{new URLSearchParams\(\{/,
    'canvas fallback should build the lesson-create handoff from structured params instead of a bare from= link',
  );
  assert.match(
    canvasPageSource,
    /subjectId: requestedSubjectId/,
    'canvas fallback should preserve subjectId when reopening lesson studio from a scoped blocker flow',
  );
  assert.match(
    canvasPageSource,
    /moduleId: requestedModuleId/,
    'canvas fallback should preserve moduleId when reopening lesson studio from a scoped blocker flow',
  );
  assert.match(
    canvasPageSource,
    /<Link href=\{createLessonHref\}/,
    'canvas fallback create-lesson CTA should use the scoped handoff href',
  );
});
