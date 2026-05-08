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
