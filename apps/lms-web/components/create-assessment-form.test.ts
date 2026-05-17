import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./create-assessment-form.tsx', import.meta.url)), 'utf8');

test('create assessment form recovers its subject context through the shared subject matcher', () => {
  assert.match(
    source,
    /findSubjectByContext\(subjects, \{\s*subjectId: defaultModule\?\.subjectId,\s*subjectName: defaultModule\?\.subjectName,\s*\}\)/s,
    'assessment gate should recover the module subject via the shared subject-context matcher when ids drift',
  );

  assert.match(
    source,
    /findSubjectByContext\(subjects, \{ subjectId \}\) \?\? defaultSubject \?\? null/,
    'active subject selection should keep using the normalized subject matcher instead of exact id-only lookup',
  );

  assert.doesNotMatch(
    source,
    /subjects\.find\(\(subject\) => subject\.id === defaultModule\?\.subjectId\)/,
    'assessment gate should not rely on brittle exact subject-id matching for its default subject',
  );
});
