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

test('dashboard defaults to the full LMS route map and keeps the pilot route map behind the override', () => {
  assert.match(
    dashboardPageSource,
    /const pilotControlPlaneEnabled = isPilotControlPlaneEnabled\(\);/,
    'dashboard should derive the pilot shell override from env instead of assuming pilot mode on main',
  );
  assert.match(
    dashboardPageSource,
    /<Card title="Full LMS route map" eyebrow="Visible shell">/,
    'dashboard should restore the default route map to the full LMS shell',
  );
  assert.match(
    dashboardPageSource,
    /Visible LMS routes/,
    'dashboard should label the default visible nav as LMS routes',
  );
  assert.match(
    dashboardPageSource,
    /The dashboard, sidebar, and topbar are back to the full LMS admin shell operators expect on main\./,
    'dashboard should say plainly that main is back on the full LMS shell',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /Pilot control plane override[\s\S]*NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE=true/,
    'default dashboard shell copy should not surface pilot override messaging on the main LMS route map card',
  );
  assert.match(
    dashboardPageSource,
    /<Card title="Pilot route map" eyebrow="Visible shell">/,
    'dashboard should keep the pilot route map code path available for the override mode',
  );
  assert.match(
    dashboardPageSource,
    /\{PILOT_OFF_SHELL_ROUTE_LABELS\.map\(\(label\) => \(/,
    'dashboard should keep rendering the specialist off-shell pills from the shared pilot-nav list',
  );
  assert.match(
    dashboardPageSource,
    /\{PILOT_BLOCKED_ROUTE_LABELS\.map\(\(label\) => \(/,
    'dashboard should render blocked pilot surfaces from the dedicated blocked-route list',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /Off-shell specialist routes[\s\S]*Curriculum Canvas|Off-shell specialist routes[\s\S]*English Studio|Off-shell specialist routes[\s\S]*Rewards|Off-shell specialist routes[\s\S]*Reports|Off-shell specialist routes[\s\S]*Guide/,
    'dashboard source should not hardcode blocked pilot labels into the off-shell specialist section',
  );
});

test('dashboard bulk blocker handoff copy keeps multi-lesson fixes on the scoped blocker flow', () => {
  assert.match(
    dashboardPageSource,
    /dashboard keeps operators on the scoped content blocker flow until the lane is structurally complete\./,
    'dashboard should explain that multi-lesson blockers stay on the content blocker flow instead of pretending one deep link solves structural gaps',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /pilot-blocked canvas/,
    'default dashboard shell copy should not leak pilot-only blocker language into the main LMS route',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /dashboard now opens the bulk lesson shell flow directly on the blocked module instead of pretending the blocker board click is enough\./,
    'dashboard should stop claiming multi-lesson blockers deep-link into canvas once the scoped blocker fix lands',
  );
});

test('dashboard normalizes progression status before building the priority queue', () => {
  assert.match(
    dashboardPageSource,
    /import \{ formatProgressionStatusLabel, normalizeProgressionStatus, progressionStatusTone \} from '\.\.\/lib\/progression-status';/,
    'dashboard should import shared progression-status helpers so queue routing survives backend casing drift',
  );
  assert.match(
    dashboardPageSource,
    /const readyLearners = workboard\.filter\(\(item\) => normalizeProgressionStatus\(item\.progressionStatus\) === 'ready'\);/,
    'dashboard should normalize ready-state matching before constructing the priority queue',
  );
  assert.match(
    dashboardPageSource,
    /const watchLearners = workboard\.filter\(\(item\) => normalizeProgressionStatus\(item\.progressionStatus\) === 'watch'\);/,
    'dashboard should normalize watch-state matching before constructing the priority queue',
  );
  assert.match(
    dashboardPageSource,
    /<Pill label=\{formatProgressionStatusLabel\(item\.progressionStatus\)\} tone=\{tone\.tone\} text=\{tone\.text\} \/>/,
    'dashboard priority queue should render the normalized progression label instead of leaking raw backend casing',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /const readyLearners = workboard\.filter\(\(item\) => item\.progressionStatus === 'ready'\);|const watchLearners = workboard\.filter\(\(item\) => item\.progressionStatus === 'watch'\);/,
    'dashboard should stop trusting raw progressionStatus equality in the priority queue',
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
    /const canInlineTopReleaseBlockerAssessmentCreate = Boolean\([\s\S]*topReleaseBlocker\.hasAuthoringContext[\s\S]*subjectsResult\.status === 'fulfilled'[\s\S]*topReleaseBlockerAssessmentSubjectId[\s\S]*topReleaseBlockerAssessmentSubjects\.length[\s\S]*\);/,
    'dashboard should only inline assessment creation when the blocker still has trustworthy authoring context and a normalized matched subject scope',
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
    /const topReleaseBlockerRecoveredSubjectId = topReleaseBlockerAssessmentSubject\?\.id\.trim\(\) \?\? '';/,
    'dashboard should centralize the recovered top-blocker subject id so every CTA can reuse the same normalized scope',
  );
  assert.match(
    dashboardPageSource,
    /const topReleaseBlockerWithRecoveredSubject = topReleaseBlocker[\s\S]*subjectId: topReleaseBlockerRecoveredSubjectId \|\| topReleaseBlocker\.subjectId,[\s\S]*: null;/,
    'dashboard should replace drifted blocker subject ids with the recovered subject scope before building dashboard CTAs',
  );
  assert.match(
    dashboardPageSource,
    /const topReleaseBlockerAssessmentSubjectId = topReleaseBlockerRecoveredSubjectId;/,
    'dashboard should gate the inline assessment action on the shared recovered subject id instead of the raw blocker payload',
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
    /const topReleaseBlockerBoardHref = buildTopReleaseBlockerBoardHref\(topReleaseBlockerWithRecoveredSubject\);/,
    'dashboard should build the scoped blocker-board CTA through the recovered blocker context so subject drift does not poison the shared helper input',
  );
  assert.match(
    dashboardPageSource,
    /const topReleaseBlockerPrimaryHref = resolveTopReleaseBlockerPrimaryHref\(\{[\s\S]*blocker: topReleaseBlockerWithRecoveredSubject,[\s\S]*\}\);/,
    'dashboard should pass the recovered blocker subject scope into the primary CTA helper so lesson-studio and canvas launches survive subject-id drift',
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

test('dashboard blocker-state content CTAs land on the blocker board instead of generic content home', () => {
  assert.match(
    dashboardPageSource,
    /\{ label: 'Content blocker board', href: '\/content\?view=blocked'/,
    'dashboard API-base blocker should send operators straight to the blocker board',
  );
  assert.match(
    dashboardPageSource,
    /\{ label: 'Open content blockers', href: '\/content\?view=blocked'/,
    'dashboard degraded-state docs should send operators to the blocker board instead of the generic content home',
  );
  assert.match(
    dashboardPageSource,
    /\{ label: 'Cross-check content blockers', href: '\/content\?view=blocked'/,
    'asset-runtime recovery docs should cross-check the blocker board specifically',
  );
  assert.match(
    dashboardPageSource,
    /\{ label: 'Check content blockers', href: '\/content\?view=blocked'/,
    'release-readiness blocker docs should point at the blocker board specifically',
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

test('dashboard build info keeps provenance gaps secondary in healthy mode', () => {
  assert.match(
    dashboardPageSource,
    /<strong style=\{\{ color: '#0f172a' \}\}>Build info<\/strong>/,
    'dashboard should relabel the healthy-state provenance card as build info instead of deployment trace',
  );
  assert.match(
    dashboardPageSource,
    /Build metadata is partial in this runtime, so the dashboard is showing the commit and API target it can verify\./,
    'dashboard should mention partial build metadata without escalating it into a healthy-mode warning banner',
  );
  assert.match(
    dashboardPageSource,
    /Missing commit\/build provenance is a traceability gap to tidy up, not a dashboard failure by itself\./,
    'dashboard should keep missing provenance secondary instead of framing it as a blocker on an otherwise healthy dashboard',
  );
  assert.doesNotMatch(
    dashboardPageSource,
    /Treat missing commit\/build provenance as a release-trace gap until the deploy pipeline restores it\./,
    'dashboard should drop the old release-ops provenance warning copy from the healthy-state dashboard',
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
