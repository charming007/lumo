import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const canvasPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

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
