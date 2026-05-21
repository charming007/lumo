import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./content-subject-lanes.tsx', import.meta.url)), 'utf8');

test('content subject lanes keep strand drag-reorder on the real strand cards only', () => {
  assert.doesNotMatch(source, /function StrandReorderLane\(/);
  assert.doesNotMatch(source, /<StrandReorderLane subject=\{subject\} strands=\{subjectStrands\} \/>/);
  assert.match(source, /reorderSubjectStrandsAction\(\{/);
  assert.match(source, /subjectId: subject\.id,/);
  assert.match(source, /orderedStrandIds: next\.map\(\(strand\) => strand\.id\),/);
  assert.match(source, /draggable=\{orderedStrands\.length > 1 && !isReorderPending\}/);
  assert.match(source, /setDraggedStrandBySubject\(\(current\) => \(\{ \.\.\.current, \[subject\.id\]: strand\.id \}\)\)/);
});

test('content subject lanes keep module drag-reorder on the real module cards only', () => {
  assert.doesNotMatch(source, /function ModuleReorderLane\(/);
  assert.doesNotMatch(source, /<ModuleReorderLane strand=\{strand\} modules=\{strandModules\} \/>/);
  assert.match(source, /reorderStrandModulesAction\(\{/);
  assert.match(source, /strandId: strand\.id,/);
  assert.match(source, /orderedModuleIds: next\.map\(\(module\) => module\.id\),/);
  assert.match(source, /draggable=\{orderedModules\.length > 1 && !isReorderPending\}/);
  assert.match(source, /setDraggedModuleByStrand\(\(current\) => \(\{ \.\.\.current, \[strand\.id\]: module\.id \}\)\)/);
});

test('content subject lanes count only payload-ready lessons in release chips', () => {
  assert.match(source, /import \{ isLessonReleaseReady \} from '\.\.\/lib\/lesson-release-readiness';/);
  assert.match(source, /const readyLessons = subjectLessons\.filter\(\(lesson\) => isLessonReleaseReady\(lesson\)\)\.length;/);
  assert.match(source, /const readyLessonCount = moduleLessons\.filter\(\(lesson\) => isLessonReleaseReady\(lesson\)\)\.length;/);
});

test('content subject lanes normalize legacy published module states before showing release-safe UI', () => {
  assert.match(source, /import \{ normalizeModuleLifecycleStatus \} from '\.\.\/lib\/module-status';/);
  assert.match(source, /const publishedModules = subjectModules\.filter\(\(module\) => normalizeModuleLifecycleStatus\(module\.status\) === 'published'\)\.length;/);
  assert.match(source, /const normalizedModuleStatus = normalizeModuleLifecycleStatus\(module\.status\);/);
  assert.match(source, /const isActive = normalizedModuleStatus === option\.value;/);
  assert.match(source, /\{normalizedModuleStatus === 'published'/);
});
