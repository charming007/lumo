import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./curriculum-canvas.ts', import.meta.url)), 'utf8');

test('curriculum canvas imports shared lesson release readiness checks', () => {
  assert.match(source, /import \{ isLessonReleaseReady \} from '\.\/lesson-release-readiness';/);
});

test('curriculum canvas keeps status-only lesson shells out of ready lesson counts', () => {
  assert.match(
    source,
    /const readyLessons = lessonNodes\.filter\(\(lesson\) => isLessonReleaseReady\(lesson\)\)\.length;/,
  );
  assert.doesNotMatch(
    source,
    /const readyLessons = lessonNodes\.filter\(\(lesson\) => \['approved', 'published', 'active'\]\.includes\(normalize\(lesson\.status\)\)\)\.length;/,
  );
});
