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

test('dashboard route map tells the truth about the visible pilot shell and off-shell specialist surfaces', () => {
  assert.match(
    dashboardPageSource,
    /<Card title="Pilot route map" eyebrow="Visible shell">/,
    'dashboard should label the route map as the visible pilot shell',
  );
  assert.match(
    dashboardPageSource,
    /Visible pilot routes/,
    'dashboard should present the visible navigation as pilot routes',
  );
  assert.match(
    dashboardPageSource,
    /Off-shell specialist routes/,
    'dashboard should call out the routes that still exist off-shell',
  );
  assert.match(
    dashboardPageSource,
    /This dashboard, the sidebar, and the visible shell now agree on the routes operators should actually trust for pilot go-live\./,
    'dashboard route map should explain that the visible shell is intentionally constrained for pilot trust',
  );
  assert.match(
    dashboardPageSource,
    /“Not in nav” is not the same thing as “blocked\.”/,
    'dashboard should explain the difference between off-shell and blocked routes',
  );
  assert.match(
    dashboardPageSource,
    /Explicitly blocked surfaces/,
    'dashboard should keep the blocked-surfaces section available when a route truly needs a blocker card',
  );
  assert.match(
    dashboardPageSource,
    /No pilot routes are intentionally blocked right now\. If that changes, say it here instead of making operators infer it from missing nav links\./,
    'dashboard should say plainly when no pilot routes are intentionally blocked instead of implying there is still a blocked surface',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /The LMS dashboard should expose the full admin shell operators actually use\.|Keep the route map, sidebar, and dashboard aligned so operators can trust the full LMS surface that is actually deployed\./,
    'dashboard should stop implying the full LMS nav is the live deployment target',
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

test('dashboard top blocker only inlines assessment-gate creation when subject context is trustworthy', () => {
  assert.match(
    dashboardPageSource,
    /import \{ CreateAssessmentForm \} from '\.\.\/components\/admin-forms';/,
    'dashboard should import the assessment creation form so the top blocker can fix missing gates directly',
  );
  assert.match(
    dashboardPageSource,
    /buttonLabel="Add assessment gate"/,
    'dashboard should expose an explicit add-assessment-gate action on the top blocker card',
  );
  assert.match(
    dashboardPageSource,
    /const canInlineTopReleaseBlockerAssessmentCreate = Boolean\([\s\S]*topReleaseBlocker\.hasAuthoringContext[\s\S]*subjectsResult\.status === 'fulfilled'[\s\S]*topReleaseBlockerNormalizedSubjectId[\s\S]*topReleaseBlockerAssessmentSubjects\.length[\s\S]*\);/,
    'dashboard should only inline assessment creation when the blocker still has trustworthy authoring context, a stable subject id, and scoped subjects',
  );
  assert.match(
    dashboardPageSource,
    /import \{ findSubjectByContext \} from '\.\.\/lib\/module-subject-match';/,
    'dashboard should reuse the shared normalized subject matcher before offering inline assessment creation',
  );
  assert.match(
    dashboardPageSource,
    /const topReleaseBlockerAssessmentSubject = topReleaseBlocker[\s\S]*\? findSubjectByContext\(subjects, \{[\s\S]*subjectId: topReleaseBlocker\.subjectId,[\s\S]*subjectName: topReleaseBlocker\.subjectName,[\s\S]*\}\)[\s\S]*: null;/,
    'dashboard should recover the top blocker subject through the shared matcher so inline gate creation survives subject-id drift',
  );
  assert.match(
    dashboardPageSource,
    /const topReleaseBlockerAssessmentSubjects = topReleaseBlockerAssessmentSubject[\s\S]*\? \[topReleaseBlockerAssessmentSubject\][\s\S]*: \[\];/,
    'dashboard should only pass the single normalized matched subject into inline assessment creation instead of the full subject list',
  );
  assert.match(
    dashboardPageSource,
    /Create the missing progression gate directly from the top dashboard blocker instead of bouncing back to the full content board first\./,
    'dashboard should explain why the direct gate action exists',
  );
  assert.match(
    dashboardPageSource,
    /<CreateAssessmentForm[\s\S]*returnPath="\/"/,
    'dashboard should wire the direct top-blocker gate action back to the dashboard after create',
  );
  assert.match(
    dashboardPageSource,
    /canInlineTopReleaseBlockerAssessmentCreate \? \([\s\S]*<ModalLauncher[\s\S]*\) : \([\s\S]*<Link href=\{topReleaseBlockerBoardHref\}/,
    'dashboard should fall back to the scoped blocker board instead of opening the assessment modal when authoring context is degraded',
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

test('dashboard API target trace and local fallback note use the real runtime host', () => {
  assert.match(
    dashboardPageSource,
    /import \{ API_BASE, API_BASE_DIAGNOSTIC, API_BASE_SOURCE \} from '\.\.\/lib\/config';/,
    'dashboard should import the resolved API base so trace copy can reflect the real runtime host',
  );
  assert.match(
    dashboardPageSource,
    /function describeApiTarget\(\) \{\s+return API_BASE_DIAGNOSTIC\.configuredApiBase \?\? API_BASE;\s+\}/,
    'dashboard should fall back to the resolved API base instead of printing “Not configured” while requests still target a real host',
  );
  assert.match(
    dashboardPageSource,
    /local development API fallback \(\$\{API_BASE\}\)/,
    'dashboard should spell out the actual local fallback host in backend trust copy',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /return API_BASE_DIAGNOSTIC\.configuredApiBase \?\? 'Not configured';/,
    'dashboard should stop claiming the API target is “Not configured” when a real fallback base is active',
  );
});

test('dashboard live pull freshness uses the real feed count instead of a hard-coded denominator', () => {
  assert.match(
    dashboardPageSource,
    /const totalDashboardFeedCount = dashboardFeedEntries\.length;/,
    'dashboard should derive its feed denominator from the actual feed list so trust copy cannot drift when feeds change',
  );
  assert.match(
    dashboardPageSource,
    /const healthyFeedCount = Math\.max\(totalDashboardFeedCount - failedSources\.length, 0\);/,
    'dashboard should clamp healthy feed counts from the live feed total instead of relying on a stale magic number',
  );
  assert.match(
    dashboardPageSource,
    /with \{healthyFeedCount\}\/\{totalDashboardFeedCount\} dashboard feeds responding/,
    'dashboard live pull freshness copy should show the real dynamic feed denominator',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /with \{healthyFeedCount\}\/10 dashboard feeds responding/,
    'dashboard should stop hard-coding 10 dashboard feeds responding once the feed count is derived from source',
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

test('global error route keeps the dashboard recovery actions without forcing Next to prerender-bug itself', () => {
  assert.doesNotMatch(
    globalErrorSource,
    /export const dynamic = 'force-dynamic';/,
    'global error route should not force dynamic rendering because Next 16 trips a prerender invariant on /_global-error during production builds',
  );
  assert.match(
    globalErrorSource,
    /Retry page/,
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
