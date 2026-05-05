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

test('content blocker actions keep multi-lesson gaps on the bulk blocker flow instead of single-lesson studio', () => {
  assert.match(
    contentPageSource,
    /import \{ resolveTopReleaseBlockerCta \} from '\.\.\/\.\.\/lib\/dashboard-top-blocker';/,
    'content blocker actions should reuse the shared blocker CTA policy so dashboard and content board do not drift',
  );
  assert.match(
    contentPageSource,
    /const blockerCta = resolveTopReleaseBlockerCta\(\{[\s\S]*missingLessons,[\s\S]*hasAuthoringContext,[\s\S]*subjectMetadataDegraded:/,
    'content blocker actions should derive their lesson-create CTA from the shared blocker resolver',
  );
  assert.match(
    contentPageSource,
    /const createLessonHref = blockerCta\.canLaunchLessonStudio && moduleSubjectId/,
    'content blocker actions should only launch lesson studio when the shared blocker resolver says the gap is a single recoverable lesson',
  );
  assert.doesNotMatch(
    contentPageSource,
    /Add lesson pack/,
    'content blocker actions should not advertise a single-lesson pack CTA that bypasses the bulk blocker flow for multi-lesson gaps',
  );
});
