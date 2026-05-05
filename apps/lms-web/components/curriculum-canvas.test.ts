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

test('curriculum canvas blocker and module handoffs carry exact module ids into content views', () => {
  assert.match(
    source,
    /href=\{`\/content\?subject=\$\{selected\.subject\.id\}&moduleId=\$\{encodeURIComponent\(selected\.module\.id\)\}&q=\$\{encodeURIComponent\(selected\.module\.title\)\}`\}/,
  );
  assert.match(
    source,
    /href=\{`\/content\?view=blocked&subject=\$\{selected\.subject\.id\}&moduleId=\$\{encodeURIComponent\(selected\.module\.id\)\}&q=\$\{encodeURIComponent\(selected\.module\.title\)\}`\}/,
  );
  assert.match(
    source,
    /assessmentBoardHref\(\{ subjectId, moduleId: assessment\.moduleId \?\? undefined, query: moduleTitle \}\)/,
  );
  assert.match(
    source,
    /href=\{`\/content\?subject=\$\{encodeURIComponent\(subjectId\)\}\$\{assessment\.moduleId \? `&moduleId=\$\{encodeURIComponent\(assessment\.moduleId\)\}` : ''\}&q=\$\{encodeURIComponent\(moduleTitle\)\}`\}/,
  );
  assert.match(
    source,
    /href=\{`\/content\?view=blocked&subject=\$\{encodeURIComponent\(subjectId\)\}\$\{assessment\.moduleId \? `&moduleId=\$\{encodeURIComponent\(assessment\.moduleId\)\}` : ''\}&q=\$\{encodeURIComponent\(moduleTitle\)\}`\}/,
  );
});
