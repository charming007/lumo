import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const contentPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');
const dashboardPageSource = readFileSync(fileURLToPath(new URL('../page.tsx', import.meta.url)), 'utf8');

test('dashboard exact blocker CTA carries a module id into the content board', () => {
  assert.match(
    dashboardPageSource,
    /const topReleaseBlockerBoardHref = buildTopReleaseBlockerBoardHref\(topReleaseBlocker\);/,
    'dashboard blocker CTA should build the scoped blocker-board href through the shared helper so the exact module id survives normalization',
  );
});

test('content board honors the focused module id filter and hard-blocks scoped drift', () => {
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
    /if \(moduleIdFilter && !focusedModule\) \{/,
    'content page should hard-block when a dashboard-scoped module id no longer exists in the live curriculum feed',
  );
  assert.match(
    contentPageSource,
    /Deployment blocker: scoped module handoff no longer matches live curriculum\./,
    'content page should escalate a missing focused module into an explicit deployment blocker',
  );
  assert.match(
    contentPageSource,
    /The dashboard passed moduleId <code style=\{\{ color: 'white', fontWeight: 900 \}\}>\{moduleIdFilter\}<\/code>, but this board cannot find that module in the live curriculum feed\./,
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
