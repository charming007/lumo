import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const contentOpsSource = readFileSync(fileURLToPath(new URL('./content-ops-form.tsx', import.meta.url)), 'utf8');
const englishStudioSource = readFileSync(fileURLToPath(new URL('./english-studio-authoring-form.tsx', import.meta.url)), 'utf8');

test('content quick-create recovers active subject from normalized context instead of exact id-only matching', () => {
  assert.match(contentOpsSource, /findSubjectByContext\(subjects, \{ subjectId \}\)/);
  assert.match(contentOpsSource, /const nextSubject = findSubjectByContext\(subjects, \{ subjectId: next \}\) \?\? null;/);
  assert.doesNotMatch(contentOpsSource, /subjects\.find\(\(subject\) => subject\.id === subjectId\)/);
  assert.doesNotMatch(contentOpsSource, /subjects\.find\(\(subject\) => subject\.id === next\)/);
});

test('english studio keeps english modules visible when subject ids drift but names still match', () => {
  assert.match(englishStudioSource, /moduleBelongsToSubject\(module, englishSubject\) \|\| module\.subjectName\?\.toLowerCase\(\)\.includes\('english'\)/);
  assert.doesNotMatch(englishStudioSource, /module\.subjectId === englishSubject\?\.id/);
});
