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

test('quick lesson shell blocks approved or published lesson creation while the selected module is still draft', () => {
  assert.match(
    contentOpsFormSource,
    /const \[lessonStatus, setLessonStatus\] = useState<'draft' \| 'approved' \| 'published'>\('draft'\);/,
    'quick lesson shell should track the requested lesson lifecycle state before submit',
  );

  assert.match(
    contentOpsFormSource,
    /activeModule\?\.status !== 'draft' \|\| lessonStatus === 'draft'[\s\S]*approved or published lessons are blocked until the lane is release-safe\./,
    'quick lesson shell should surface an explicit release blocker when a draft module is asked to host an approved or published lesson',
  );

  assert.match(
    contentOpsFormSource,
    /<FieldLabel>Status<select name="status" value=\{lessonStatus\} onChange=\{\(event\) => setLessonStatus\(event\.target\.value as 'draft' \| 'approved' \| 'published'\)\} style=\{inputStyle\}>[\s\S]*<option value="draft">Draft<\/option>[\s\S]*<option value="approved">Approved<\/option>[\s\S]*<option value="published">Published<\/option>/,
    'quick lesson shell should keep the status picker controlled so the release blocker reacts before submit',
  );

  assert.match(
    contentOpsFormSource,
    /disabled=\{formBlockers\.length > 0\}/,
    'quick lesson shell submit should be disabled when release blockers are present, not just missing dependencies',
  );
});
