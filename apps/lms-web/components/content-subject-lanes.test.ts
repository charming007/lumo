import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('./content-subject-lanes.tsx', import.meta.url)), 'utf8');

test('content subject lanes sort strands by persisted order before rendering the subject lane', () => {
  assert.match(
    source,
    /function sortByOrderThenName<T extends \{ order\?: number \| null; name\?: string \| null \}>\(items: T\[\]\) \{[\s\S]*return \[\.\.\.items\]\.sort\(\(left, right\) => \(left\.order \?\? 999\) - \(right\.order \?\? 999\) \|\| \(left\.name \?\? ''\)\.localeCompare\(right\.name \?\? ''\)\);[\s\S]*\}/,
    'subject lane should have a stable order-aware strand sorter',
  );
  assert.match(
    source,
    /const subjectStrands = sortByOrderThenName\(strands\.filter\(\(strand\) => subjectsIncludeId\(\[subject\], strand\.subjectId\)\)\);/,
    'subject lane should render strands in persisted order instead of raw API array order',
  );
});
