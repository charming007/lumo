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

test('content blockers count only payload-ready lessons toward release readiness', () => {
  assert.match(
    contentPageSource,
    /import \{ isLessonReleaseReady \} from '\.\.\/\.\.\/lib\/lesson-release-readiness';/,
    'content board should share the payload-ready lesson readiness helper with the dashboard instead of trusting status labels alone',
  );
  assert.match(
    contentPageSource,
    /const readyLessonCount = moduleLessons\.filter\(\(lesson\) => isLessonReleaseReady\(lesson\)\)\.length;/,
    'content blocker rows should only count lessons with launchable activity payloads as release-ready',
  );
  assert.match(
    contentPageSource,
    /still need launchable activity payloads before release/,
    'content blocker copy should tell operators the exact payload gap instead of implying status labels alone are enough',
  );
});

test('content blockers reuse shared module release checks so subject-context failures cannot look publish-safe', () => {
  assert.match(
    contentPageSource,
    /import \{ getModuleReleaseState \} from '\.\.\/\.\.\/lib\/module-release';/,
    'content board should reuse the shared module release-state helper instead of drifting from dashboard release logic',
  );
  assert.match(
    contentPageSource,
    /const releaseState = getModuleReleaseState\(\{[\s\S]*module,[\s\S]*lessons,[\s\S]*assessments,[\s\S]*subjects,[\s\S]*\}\);/,
    'content blocker detection should evaluate the same module release inputs the dashboard uses',
  );
  assert.match(
    contentPageSource,
    /return releaseState\.publishBlockers\.length > 0 \|\| module\.status === 'draft';/,
    'content board should treat shared publish blockers as release blockers so broken subject context cannot disappear from the UI',
  );
  assert.match(
    contentPageSource,
    /Subject context must be repaired before this lane is safe to publish\./,
    'content blocker rows should tell operators plainly when subject context still blocks release',
  );
});

test('content board treats strand outages as critical release blockers', () => {
  assert.match(
    contentPageSource,
    /const criticalReleaseFailures = \[[\s\S]*strandsResult\.status === 'rejected' \? 'strands' : null,[\s\S]*\]\.filter\(Boolean\);/,
    'content page should treat a missing strands feed as a critical release-readiness failure, not a soft warning',
  );
  assert.match(
    contentPageSource,
    /Strands are the structural spine for subject lanes and module placement\./,
    'content page should explain why a missing strands feed blocks deployment trust for the curriculum board',
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

test('content blocker review-gate CTA keeps exact module scope instead of a fuzzy title-only search', () => {
  assert.match(
    contentPageSource,
    /buildAssessmentReviewHref\(\{ returnPath, moduleTitle: module\.title, moduleId: module\.id, subjectId: moduleSubjectId \}\)/,
    'content blocker review-gate CTA should carry the exact module id into the assessments board so operators review the intended gate',
  );
});
