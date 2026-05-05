import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const contentPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');
const dashboardPageSource = readFileSync(fileURLToPath(new URL('../page.tsx', import.meta.url)), 'utf8');

test('dashboard exact blocker CTA carries a module id into the content board', () => {
  assert.match(
    dashboardPageSource,
    /view=blocked&moduleId=\$\{encodeURIComponent\(topReleaseBlocker\.id\)\}/,
    'dashboard blocker CTA should deep-link the exact module id instead of relying on a fuzzy title search alone',
  );
});

test('content board honors the focused module id filter and calls out drift', () => {
  assert.match(
    contentPageSource,
    /moduleId\?: string \| string\[]/,
    'content page should accept moduleId in its search params so dashboard blocker links can target an exact module',
  );
  assert.match(
    contentPageSource,
    /const moduleIdFilter = normalizeFilterValue\(query\?\.moduleId\)\.trim\(\);/,
    'content page should normalize the incoming moduleId filter',
  );
  assert.match(
    contentPageSource,
    /const moduleMatches = moduleIdMatches\(module\.id\);/,
    'blocked module rows should be narrowed by exact module id when present',
  );
  assert.match(
    contentPageSource,
    /The dashboard passed moduleId \$\{moduleIdFilter\}, but this board cannot find that module in the live curriculum feed\./,
    'content board should treat a missing focused module as stale or mismatched deployment evidence',
  );
});
