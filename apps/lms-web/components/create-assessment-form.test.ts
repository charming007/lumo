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

test('create assessment form only offers supported assessment statuses and defaults from module state', () => {
  assert.match(
    source,
    /function resolveAssessmentStatusDefault\(moduleStatus\?: string \| null\)/,
    'assessment gate should normalize the default status from the selected module state',
  );

  assert.match(
    source,
    /moduleStatus === 'published' \|\| moduleStatus === 'active'\) return 'active';/,
    'assessment gate should default live-ready modules to an active assessment gate instead of writing a fake published status',
  );

  assert.match(
    source,
    /<select name="status" defaultValue=\{defaultStatus\} style=\{inputStyle\} key=\{selectedModule\?\.id \?\? 'no-module'\}>[\s\S]*<option value="draft">Draft<\/option>[\s\S]*<option value="active">Active<\/option>/,
    'assessment gate should expose the supported draft/active assessment statuses and re-seed when the module changes',
  );

  assert.doesNotMatch(
    source,
    /<option value="review">In review<\/option>|<option value="published">Published<\/option>|<option value="retired">Retired<\/option>/,
    'assessment gate should not offer module lifecycle labels that create non-functional assessment statuses',
  );
});
