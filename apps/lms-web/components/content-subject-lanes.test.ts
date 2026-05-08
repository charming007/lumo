import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./content-subject-lanes.tsx', import.meta.url)), 'utf8');

test('content subject lanes expose direct strand drag-reorder controls on the subject lane surface', () => {
  assert.match(source, /function StrandReorderLane\(/);
  assert.match(source, /reorderSubjectStrandsAction\(\{/);
  assert.match(source, /subjectId: subject\.id,/);
  assert.match(source, /orderedStrandIds: next\.map\(\(strand\) => strand\.id\),/);
  assert.match(source, /Drag strands to reorder the lane\./);
  assert.match(source, /<StrandReorderLane subject=\{subject\} strands=\{subjectStrands\} \/>/);
});
