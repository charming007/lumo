import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dashboardPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');
const globalErrorSource = readFileSync(fileURLToPath(new URL('./global-error.tsx', import.meta.url)), 'utf8');
const deployChecklistPublicPath = fileURLToPath(new URL('../public/DEPLOY_VERIFICATION_CHECKLIST.html', import.meta.url));

test('dashboard does not hard-block on subject metadata degradation alone', () => {
  assert.doesNotMatch(
    dashboardPageSource,
    /subjectsResult\.status === 'rejected' \? 'subjects' : null/,
    'subject feed degradation alone should not be counted as a critical dashboard release blocker',
  );
  assert.match(
    dashboardPageSource,
    /releaseFeedsAvailable = modulesResult\.status === 'fulfilled' && lessonsResult\.status === 'fulfilled' && assessmentsResult\.status === 'fulfilled';/,
    'dashboard release snapshot should stay available when only subject metadata is degraded',
  );
  assert.match(
    dashboardPageSource,
    /Subject metadata is degraded, but the dashboard can still launch Lesson Studio when the module itself carries enough subject context to recover the authoring lane\./,
    'dashboard should surface subject metadata degradation as a warning instead of a hard blocker',
  );
});

test('dashboard route map reflects the full LMS shell instead of the pilot control-plane copy', () => {
  assert.match(
    dashboardPageSource,
    /<Card title="LMS route map" eyebrow="Admin shell">/,
    'dashboard should label the route map as the LMS admin shell',
  );
  assert.match(
    dashboardPageSource,
    /Admin routes/,
    'dashboard should present the visible navigation as admin routes',
  );
  assert.match(
    dashboardPageSource,
    /The LMS dashboard should expose the full admin shell operators actually use\./,
    'dashboard route map should explain that the full LMS shell is the intended production experience',
  );
  assert.match(
    dashboardPageSource,
    /Keep the route map, sidebar, and dashboard aligned so operators can trust the full LMS surface that is actually deployed\./,
    'dashboard should explain why route-map and sidebar scope must stay aligned',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /Pilot route map|Sidebar control plane|Not in nav” is not the same thing as “blocked\./,
    'dashboard should no longer ship the control-plane route map copy on the landing page',
  );
});

test('dashboard bulk blocker handoff copy matches the direct canvas launch', () => {
  assert.match(
    dashboardPageSource,
    /dashboard now opens the bulk lesson shell flow directly on the blocked module instead of pretending the blocker board click is enough\./,
    'dashboard should describe the real direct bulk-flow launch instead of the old blocker-board detour',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /dashboard sends them back to the blocker board where the bulk shell flow already exists\./,
    'dashboard should not keep shipping the stale blocker-board detour copy once the direct CTA exists',
  );
});

test('dashboard reuses the normalized blocker-board href helper instead of hand-building dashboard CTA links', () => {
  assert.match(
    dashboardPageSource,
    /import \{ buildTopReleaseBlockerBoardHref, resolveTopReleaseBlockerPrimaryHref \} from '\.\.\/lib\/dashboard-top-blocker-link';/,
    'dashboard should import the normalized blocker-board href helper alongside the primary CTA resolver',
  );
  assert.match(
    dashboardPageSource,
    /const topReleaseBlockerBoardHref = buildTopReleaseBlockerBoardHref\(topReleaseBlocker\);/,
    'dashboard should build the scoped blocker-board CTA through the shared helper so subject/module normalization stays in one place',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /const topReleaseBlockerBoardHref = topReleaseBlocker\s*\? `\/content\?view=blocked&moduleId=/,
    'dashboard should not hand-build scoped blocker-board query strings after the deep-link normalization fix',
  );
});

test('dashboard blocked modules snapshot summarizes all blocker types instead of draft-only copy', () => {
  assert.match(
    dashboardPageSource,
    /function describeReleaseBlockerSnapshot\(/,
    'dashboard should centralize blocked-module snapshot copy so it can describe the real blocker mix',
  );
  assert.match(
    dashboardPageSource,
    /missingLessonCount > 0[\s\S]*missing lesson gap/,
    'dashboard blocked-modules snapshot should mention missing lesson gaps when they exist',
  );
  assert.match(
    dashboardPageSource,
    /missingGateCount > 0[\s\S]*assessment gates/,
    'dashboard blocked-modules snapshot should mention missing assessment gates when they exist',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /releaseBlockers\.length\s*\?\s*`\$\{draftModuleBlockers\.length\} draft module/,
    'dashboard should not reduce every blocked-module summary to draft-module copy when non-draft blockers exist',
  );
});

test('dashboard deploy checklist CTA points at a shipped public document', () => {
  assert.match(
    dashboardPageSource,
    /href: '\/DEPLOY_VERIFICATION_CHECKLIST\.html'/,
    'dashboard should keep exposing the deploy verification checklist CTA',
  );
  assert.ok(
    (dashboardPageSource.match(/href: '\/DEPLOY_VERIFICATION_CHECKLIST\.html'/g) ?? []).length >= 2,
    'dashboard should keep the deploy verification checklist visible even when the route is hard-blocked',
  );
  assert.equal(
    existsSync(deployChecklistPublicPath),
    true,
    'dashboard deploy checklist CTA should not point at a missing public HTML file',
  );
});

test('dashboard deployment trace tells the truth when provenance metadata is missing', () => {
  assert.match(
    dashboardPageSource,
    /dashboard now says that plainly instead of faking a fresh timestamp/,
    'dashboard should warn when deployment metadata is incomplete instead of implying a fake fresh build trace',
  );
  assert.match(
    dashboardPageSource,
    /Treat missing commit\/build provenance as a release-trace gap until the deploy pipeline restores it\./,
    'dashboard should call missing provenance a release-trace gap so deployment review does not treat source-archive builds as trustworthy',
  );
});

test('wrong-backend blocker exposes route evidence and copy-paste verification commands', () => {
  assert.match(
    dashboardPageSource,
    /evidenceTitle=\{backendTargetDiagnosis \? 'Wrong-backend evidence' : undefined\}/,
    'dashboard blocker should label wrong-backend evidence explicitly',
  );
  assert.match(
    dashboardPageSource,
    /commandTitle=\{backendTargetDiagnosis \? 'Copy-paste backend verification' : undefined\}/,
    'dashboard blocker should expose a copy-paste verification command card when wrong-backend diagnosis trips',
  );
  assert.match(
    dashboardPageSource,
    /admin\/config\/audit/,
    'dashboard blocker should include the admin config audit probe in its verification command block',
  );
  assert.match(
    dashboardPageSource,
    /Failing routes: \$\{backendTargetDiagnosis\.requestUrls\.join\(', '\)\}/,
    'dashboard blocker should surface the exact failing routes when wrong-backend evidence is available',
  );
});

test('global error route stays dynamic and offers the dashboard recovery actions', () => {
  assert.match(
    globalErrorSource,
    /export const dynamic = 'force-dynamic';/,
    'global error route should stay dynamic so production crashes render the latest recovery UI',
  );
  assert.match(
    globalErrorSource,
    /Retry dashboard/,
    'global error route should keep the retry action visible',
  );
  assert.match(
    globalErrorSource,
    /Treat this as a deployment blocker until proven otherwise\./,
    'global error route should call out repeated runtime crashes as a deployment blocker',
  );
  assert.match(
    globalErrorSource,
    /href="\/settings"/,
    'global error route should keep the settings escape hatch visible',
  );
  assert.match(
    globalErrorSource,
    /href="\/DEPLOY_VERIFICATION_CHECKLIST\.html"/,
    'global error route should link directly to the shipped deploy checklist',
  );
  assert.match(
    globalErrorSource,
    /href="\/content\?view=blocked"/,
    'global error route should expose the content blocker board as a recovery path',
  );
});
