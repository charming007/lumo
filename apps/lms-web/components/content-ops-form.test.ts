import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const contentOpsFormSource = readFileSync(fileURLToPath(new URL('./content-ops-form.tsx', import.meta.url)), 'utf8');

test('quick lesson shell recovers active subject from normalized subject context instead of exact id-only matching', () => {
  assert.match(contentOpsFormSource, /findSubjectByContext\(subjects, \{/);
  assert.match(contentOpsFormSource, /subjectId,/);
  assert.match(contentOpsFormSource, /subjectName: initialSubject\?\.name,/);
  assert.doesNotMatch(contentOpsFormSource, /subjects\.find\(\(subject\) => subject\.id === subjectId\)/);
});

test('quick lesson shell reconciles stale subject and module state when subject ids drift', () => {
  assert.match(contentOpsFormSource, /const reconciledSubjectId = activeSubject\?\.id \?\? initialSubject\?\.id \?\? '';/);
  assert.match(contentOpsFormSource, /setSubjectId\(reconciledSubjectId\);/);
  assert.match(contentOpsFormSource, /const nextModuleId = filteredModules\.some\(\(module\) => module\.id === moduleId\)/);
  assert.match(contentOpsFormSource, /setModuleId\(nextModuleId\);/);
});
