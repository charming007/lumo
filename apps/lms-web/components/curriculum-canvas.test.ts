import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./curriculum-canvas.tsx', import.meta.url)), 'utf8');

test('curriculum canvas recovers subject selection from normalized context instead of exact id-only matching', () => {
  assert.match(
    source,
    /const nextSubject = data\.subjects\.find\(\(subject\) => subjectMatchesContext\(subject, \{[\s\S]*subjectIds: \[nextSubjectId\],[\s\S]*subjectNames: \[nextSubjectId\],[\s\S]*\}\)\) \?\? null;/s,
  );
  assert.doesNotMatch(source, /data\.subjects\.find\(\(subject\) => subject\.id === nextSubjectId\)/);
});
