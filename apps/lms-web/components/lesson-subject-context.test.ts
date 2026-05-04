import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const createFormSource = readFileSync(fileURLToPath(new URL('./lesson-create-form.tsx', import.meta.url)), 'utf8');
const editorFormSource = readFileSync(fileURLToPath(new URL('./lesson-editor-form.tsx', import.meta.url)), 'utf8');

test('lesson create form resolves initial subject from normalized subject context instead of exact id-only matching', () => {
  assert.match(createFormSource, /findSubjectByContext\(subjects, \{/);
  assert.match(createFormSource, /subjectId: duplicateLesson\.subjectId,/);
  assert.match(createFormSource, /subjectName: duplicateLesson\.subjectName,/);
  assert.doesNotMatch(createFormSource, /subjects\.find\(\(subject\) => subject\.id === initialSubjectId\)/);
  assert.doesNotMatch(createFormSource, /subjects\.find\(\(subject\) => subject\.id === duplicateSubjectId\)/);
});

test('lesson editor form resolves initial and active subject from normalized lesson context', () => {
  assert.match(editorFormSource, /const initialSubject = findSubjectByContext\(subjects, \{/);
  assert.match(editorFormSource, /subjectId: lesson\.subjectId,/);
  assert.match(editorFormSource, /subjectName: lesson\.subjectName,/);
  assert.match(editorFormSource, /const \[subjectId, setSubjectId\] = useState\(initialSubject\?\.id \?\? ''\);/);
  assert.match(editorFormSource, /subjects\.find\(\(subject\) => subject\.id === subjectId\) \?\? initialSubject \?\? null/);
});
