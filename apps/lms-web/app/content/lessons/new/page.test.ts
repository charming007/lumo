import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('derived lesson-authoring subjects dedupe fallback module context with normalized ids and names', () => {
  assert.match(source, /const derivedSubjectKeys = new Set<string>\(\);/);
  assert.match(source, /const normalizedId = derived\.id\.trim\(\)\.toLowerCase\(\);/);
  assert.match(source, /const normalizedName = derived\.name\.trim\(\)\.toLowerCase\(\);/);
  assert.match(source, /if \(duplicateKeys\.some\(\(key\) => derivedSubjectKeys\.has\(key\)\)\) \{/);
  assert.match(source, /duplicateKeys\.forEach\(\(key\) => derivedSubjectKeys\.add\(key\)\);/);
});

test('lesson create form remounts when launch context query changes so client navigation does not hydrate stale authoring state', () => {
  assert.match(source, /const lessonCreateFormKey = \[/);
  assert.match(source, /<LessonCreateForm\s+key=\{lessonCreateFormKey\}/);
  assert.match(source, /duplicateLessonId \?\? ''/);
  assert.match(source, /from,/);
});
