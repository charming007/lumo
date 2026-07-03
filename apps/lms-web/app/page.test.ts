import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dashboardPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');
const globalErrorSource = readFileSync(fileURLToPath(new URL('./global-error.tsx', import.meta.url)), 'utf8');
const deviceDeploymentHandoffSource = readFileSync(fileURLToPath(new URL('../components/device-deployment-handoff.tsx', import.meta.url)), 'utf8');
const deviceDeploymentHelperSource = readFileSync(fileURLToPath(new URL('../lib/device-deployment.ts', import.meta.url)), 'utf8');
const deployChecklistPublicPath = fileURLToPath(new URL('../public/DEPLOY_VERIFICATION_CHECKLIST.html', import.meta.url));

test('dashboard hard-blocks when the subject feed is degraded', () => {
  assert.match(
    dashboardPageSource,
    /subjectsResult\.status === 'rejected' \? 'subjects' : null/,
    'subject feed degradation should count as a critical dashboard release blocker because blocker triage and authoring scope depend on live subject context',
  );
  assert.match(
    dashboardPageSource,
    /releaseFeedsAvailable = modulesResult\.status === 'fulfilled' && lessonsResult\.status === 'fulfilled' && assessmentsResult\.status === 'fulfilled' && subjectsResult\.status === 'fulfilled';/,
    'dashboard release snapshot should only be treated as live when the subject feed is also available',
  );
  assert.match(
    dashboardPageSource,
    /subject context can drift just enough to turn blocker CTAs into confident nonsense\./,
    'dashboard blocker copy should explain why missing subjects is a release-trust failure, not a harmless metadata warning',
  );
});

test('dashboard keeps the pilot route map available for the explicit override and leaves the full LMS shell as the default path', () => {
  assert.match(
    dashboardPageSource,
    /const pilotControlPlaneEnabled = isPilotControlPlaneEnabled\(\);/,
    'dashboard should still derive shell mode from the shared pilot control-plane helper',
  );
  assert.match(
    dashboardPageSource,
    /<Card title="Pilot route map" eyebrow="Visible shell">/,
    'dashboard should keep the pilot route map code path available for the production-safe shell',
  );
  assert.match(
    dashboardPageSource,
    /Visible pilot routes/,
    'dashboard should label the production-safe visible nav as pilot routes',
  );
  assert.match(
    dashboardPageSource,
    /This dashboard, the sidebar, and the visible shell now agree on the routes operators should actually trust for pilot go-live\./,
    'dashboard should keep the pilot-safe route map copy available for the explicit override mode',
  );
  assert.match(
    dashboardPageSource,
    /<Card title="Full LMS route map" eyebrow="Visible shell">/,
    'dashboard should keep the full LMS route map code path available for the explicit override mode',
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
    /import \{ findSubjectByContext \} from '\.\.\/lib\/module-subject-match';/,
    'dashboard should recover scoped assessment subjects through the shared normalized subject matcher',
  );
  assert.match(
    dashboardPageSource,
    /buttonLabel="Add assessment gate"/,
    'dashboard should expose an explicit add-assessment-gate action on the top blocker card',
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
    /const scopedAssessmentSubject = topReleaseBlocker[\s\S]*findSubjectByContext\(subjects, \{[\s\S]*subjectId: topReleaseBlockerRecoveredSubjectId \|\| topReleaseBlocker\.subjectId,[\s\S]*subjectName: topReleaseBlockerAssessmentSubject\?\.name \?\? topReleaseBlocker\.subjectName,[\s\S]*\}\) \?\? topReleaseBlockerAssessmentSubject[\s\S]*: null;/,
    'dashboard should keep the inline gate scope pinned to the recovered blocker subject before falling back to the earlier normalized match',
  );
  assert.match(
    dashboardPageSource,
    /const topReleaseBlockerAssessmentSubjectId = scopedAssessmentSubject\?\.id\.trim\(\) \?\? topReleaseBlockerRecoveredSubjectId;/,
    'dashboard should gate the inline assessment action on the scoped recovered subject id instead of the raw blocker payload',
  );
  assert.match(
    dashboardPageSource,
    /const topReleaseBlockerAssessmentSubjects = scopedAssessmentSubject \? \[scopedAssessmentSubject\] : \[];/,
    'dashboard should keep the top-blocker assessment modal pinned to one normalized recovered subject instead of falling back to an unscoped subject list when ids drift',
  );
  assert.match(
    dashboardPageSource,
    /const canInlineTopReleaseBlockerAssessmentCreate = Boolean\([\s\S]*topReleaseBlocker\.hasAuthoringContext[\s\S]*subjectsResult\.status === 'fulfilled'[\s\S]*scopedAssessmentSubject[\s\S]*topReleaseBlockerAssessmentSubjectId[\s\S]*topReleaseBlockerAssessmentSubjects\.length[\s\S]*\);/,
    'dashboard should only inline assessment creation when the blocker still has trustworthy authoring context and a normalized matched subject scope',
  );
  assert.match(
    dashboardPageSource,
    /Create the missing progression gate directly from the top dashboard blocker instead of bouncing back to the full content board first\./,
    'dashboard should explain why the direct gate action exists',
  );
  assert.match(
    dashboardPageSource,
    /<CreateAssessmentForm[\s\S]*subjectId: topReleaseBlockerWithRecoveredSubject\?\.subjectId \?\? topReleaseBlocker\.subjectId,[\s\S]*subjectName: topReleaseBlockerAssessmentSubject\?\.name \?\? topReleaseBlocker\.subjectName,[\s\S]*returnPath="\/"/,
    'dashboard should pass the recovered subject scope into direct top-blocker gate creation so subject-id drift does not create the gate on the wrong subject',
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

test('dashboard hard-blocks when release feeds resolve but the curriculum graph is internally contradictory', () => {
  assert.match(
    dashboardPageSource,
    /const hasReleaseGraphMismatch = releaseFeedsAvailable && \([\s\S]*modules\.length > 0 && lessons\.length === 0 && modules\.some\(\(module\) => module\.lessonCount > 0\)[\s\S]*modules\.length === 0 && \(lessons\.length > 0 \|\| assessments\.length > 0\)[\s\S]*\);/,
    'dashboard should detect impossible curriculum release graphs instead of treating them as honest authoring blockers',
  );
  assert.match(
    dashboardPageSource,
    /hasCriticalAssetOpsGap,\s+hasEmptyReleaseBoard,\s+hasDeviceDeploymentGap,\s+hasReleaseGraphMismatch,\s+\}\)\) \{/,
    'dashboard blocker gate should include contradictory release graphs in its hard-block decision',
  );
  assert.match(
    dashboardPageSource,
    /Deployment blocker: curriculum release graph is internally contradictory\./,
    'dashboard should call out contradictory curriculum data as an explicit deployment blocker',
  );
  assert.match(
    dashboardPageSource,
    /live modules claim lesson coverage while the lessons feed came back empty/,
    'dashboard should explain the stale-backend failure mode when modules resolve but lessons disappear',
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

test('dashboard surfaces learner app deployment handoff from live device registrations', () => {
  assert.match(
    dashboardPageSource,
    /import \{ DeviceDeploymentHandoff \} from '\.\.\/components\/device-deployment-handoff';/,
    'dashboard should import the learner app deployment handoff component',
  );
  assert.match(
    dashboardPageSource,
    /import \{ getDeviceDeploymentReadiness \} from '\.\.\/lib\/device-deployment';/,
    'dashboard should import the shared learner app rollout readiness helper',
  );
  assert.match(
    dashboardPageSource,
    /fetchDeviceRegistrations\(\),/,
    'dashboard should pull live device registrations so learner build rollout readiness is visible from the front door',
  );
  assert.match(
    dashboardPageSource,
    /const deviceDeploymentReadiness = deviceRegistrationsResult\.status === 'fulfilled'[\s\S]*getDeviceDeploymentReadiness\(deviceRegistrations\)/,
    'dashboard should derive rollout readiness from the live device-registration feed',
  );
  assert.match(
    dashboardPageSource,
    /const hasDeviceDeploymentGap = deviceRegistrationsResult\.status === 'rejected'[\s\S]*!deviceDeploymentReadiness\.hasRolloutReadyRegistration;/,
    'dashboard should treat blind or zero-ready learner rollout handoff as a top-level deployment gap',
  );
  assert.match(
    dashboardPageSource,
    /Learner app deployment handoff/,
    'dashboard should label the new learner app rollout block explicitly',
  );
  assert.match(
    dashboardPageSource,
    /Only tablets with a real pod owner, active status, and no duplicate live scope should get a learner release bundle\./,
    'dashboard should explain the rollout-safety rules instead of making operators infer them',
  );
  assert.match(
    dashboardPageSource,
    /<DeviceDeploymentHandoff registrations=\{deviceRegistrations\} apiBase=\{apiTarget\} \/>/,
    'dashboard should render the copy-paste learner build handoff against the actual dashboard API target',
  );
  assert.match(
    dashboardPageSource,
    /!deviceRegistrations\.length \? \(/,
    'dashboard should treat an empty tablet registry as a deployment blocker, not a harmless zero-state',
  );
  assert.match(
    dashboardPageSource,
    /Tablet deployment handoff is blocked because the LMS has zero registered tablets\./,
    'dashboard should call out the zero-tablet rollout blocker explicitly',
  );
  assert.match(
    dashboardPageSource,
    /Tablet deployment handoff is blocked because every registered tablet is missing at least one rollout requirement\./,
    'dashboard should escalate the all-blocked tablet state into an explicit deployment blocker instead of burying it in the handoff table',
  );
  assert.match(
    dashboardPageSource,
    /Top blockers: \{deviceDeploymentReadiness\.blockingSummary\.slice\(0, 3\)\.map\(\(entry\) => `\$\{entry\.count\} \$\{entry\.label\}`\)\.join\(', '\)\}\./,
    'dashboard should summarize the top rollout blocker counts when every registered tablet is blocked',
  );
  assert.match(
    dashboardPageSource,
    /Repair tablet records/,
    'dashboard should keep a direct repair CTA when every registered tablet is blocked',
  );
  assert.match(
    dashboardPageSource,
    /<Link href="\/devices" style=\{\{ \.\.\.quickActionStyle, background: '#991B1B', color: 'white', padding: '10px 12px' \}\}>\s*Register first tablet\s*<\/Link>/,
    'dashboard should give zero-tablet rollout blockers a direct CTA into device registration',
  );
  assert.match(
    dashboardPageSource,
    /<Link href="\/settings" style=\{\{ \.\.\.quickActionStyle, background: '#fff', color: '#991B1B', border: '1px solid #FCA5A5', padding: '10px 12px' \}\}>\s*Check deployment settings\s*<\/Link>/,
    'dashboard should keep deployment config recovery one click away when learner rollout is fully blocked',
  );
  assert.match(
    dashboardPageSource,
    /Tablet deployment handoff is blind right now because device registrations failed to load\./,
    'dashboard should warn loudly when learner rollout targeting is blind',
  );
  assert.match(
    dashboardPageSource,
    /hasDeviceDeploymentGap,/,
    'dashboard should feed learner rollout readiness into the top-level blocker gate',
  );
});

test('device deployment handoff only treats active tablets as duplicate live scope and shell-escapes provisioning commands', () => {
  assert.match(
    deviceDeploymentHandoffSource,
    /function shellEscape\(value: string\)/,
    'device deployment handoff should shell-escape provisioning snippets before copy-paste',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /cd apps\/learner-tablet/,
    'learner provisioning bundle should start in the Flutter app directory instead of assuming imaginary root npm scripts',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /flutter build web --release/,
    'learner web provisioning bundle should use the real Flutter release build command',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /flutter build apk --release/,
    'learner APK provisioning bundle should use the real Flutter release build command',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /function buildAndroidSigningEnvTemplate\(\)/,
    'device deployment handoff should expose a reusable Android signing template instead of assuming APK signing is magically configured',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Android release signing is a hard deployment blocker/,
    'handoff should call out missing Android release signing as a deployment blocker before operators copy APK commands',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /flutter build apk --release<\/code> will fail unless the learner app gets a real release keystore/,
    'handoff should explain plainly that release APK builds fail without a real keystore',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /LUMO_ANDROID_STORE_FILE/,
    'handoff should surface the Android signing env contract used by the learner release build',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Copy signing env template/,
    'handoff should keep the signing env template copyable for deployment operators',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /--dart-define=LUMO_API_BASE_URL=\$\{shellEscape\(normalizedApiBase\)\}/,
    'learner release build command should pass the API base through Flutter dart-define',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /--dart-define=LUMO_DEVICE_IDENTIFIER=\$\{shellEscape\(deviceIdentifier\)\}/,
    'learner release build command should pass the device identifier through Flutter dart-define',
  );
  assert.doesNotMatch(
    deviceDeploymentHandoffSource,
    /npm run build:learner:(web|apk)/,
    'learner deployment handoff should stop advertising nonexistent root npm build scripts',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /export API_BASE=\$\{shellEscape\(base\)\}/,
    'bootstrap curl smoke test should shell-escape the API base export',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /export DEVICE_IDENTIFIER=\$\{shellEscape\(deviceIdentifier\)\}/,
    'bootstrap curl smoke test should shell-escape the device identifier export',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /curl -fsS -G \\\"\$API_BASE\/api\/v1\/learner-app\/bootstrap\\\" \\\\/,
    'bootstrap curl smoke test should hit the learner bootstrap with curl -G so query parameters stay explicit',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /--data-urlencode \\\"deviceIdentifier=\$DEVICE_IDENTIFIER\\\" \\\\/,
    'bootstrap curl smoke test should URL-encode the device identifier instead of trusting raw shell interpolation in the query string',
  );
  assert.doesNotMatch(
    deviceDeploymentHandoffSource,
    /bootstrap\?deviceIdentifier=\$DEVICE_IDENTIFIER/,
    'bootstrap curl smoke test should stop inlining raw device identifiers into the query string',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /const normalizedPodId = normalizePodIdentifier\(registration\.podId\);[\s\S]*if \(!normalizedPodId \|\| normalizedStatus !== 'active'\) return accumulator;/,
    'duplicate live scope should normalize pod ids first so case or whitespace drift does not sneak through the handoff UI',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /const normalizedIdentifier = normalizeDeviceIdentifier\(registration\.deviceIdentifier\);/,
    'handoff should normalize tablet identifiers before duplicate checks so case or whitespace drift does not sneak through rollout review',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /if \(!normalizedIdentifier \|\| normalizedStatus !== 'active'\) return accumulator;/,
    'handoff should only treat active non-blank tablet identifiers as rollout-safe duplicate signals',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Device identifier is blank, so the dashboard cannot generate a trustworthy learner release bundle for this tablet yet\./,
    'handoff should block blank learner rollout identifiers instead of generating a bogus provisioning bundle',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /This device identifier is duplicated across active tablet records\./,
    'handoff should hard-block duplicate live tablet identifiers before release commands get copied',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /blank device ID/,
    'handoff blocker summary should count blank device identifiers explicitly',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /duplicate device ID/,
    'handoff blocker summary should count duplicate device identifiers explicitly',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Device identifier missing/,
    'handoff card should fall back to an explicit missing-identifier label instead of rendering an empty heading',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Keep the diagnostics copyable even while provisioning is blocked so ops can fix the exact tablet record instead of retyping device ids, bootstrap probes, or backend targets from screenshots\./,
    'blocked handoff rows should stay operational by surfacing copyable diagnostics instead of dead-ending at prose',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Copy device identifier/,
    'blocked handoff rows should expose the tablet identifier as copyable repair data',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Copy LMS API target/,
    'blocked handoff rows should expose the normalized LMS API target for repair and cross-checking',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Collision evidence/,
    'blocked handoff rows should surface exact collision evidence instead of generic duplicate warnings',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Pod conflict: \{peer\}/,
    'blocked handoff rows should name the exact pod-conflicting tablet peers',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Device ID collision: \{peer\}/,
    'blocked handoff rows should name the exact duplicate device-id peers',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Copy pod collision peers/,
    'blocked handoff rows should keep pod collision peers copyable for ops handoff',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Copy device ID collision peers/,
    'blocked handoff rows should keep duplicate device-id peers copyable for ops handoff',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /normalizeDeviceIdentifier\(registration\.deviceIdentifier\) \? \(/,
    'blocked handoff diagnostics should only surface bootstrap probes when a real device identifier exists',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Copy bootstrap probe/,
    'blocked handoff rows should keep the learner bootstrap probe copyable for rollout debugging',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /Copy curl smoke test/,
    'blocked handoff rows should keep the curl smoke test copyable for rollout debugging',
  );
  assert.match(
    deviceDeploymentHandoffSource,
    /multiple active tablets attached/,
    'handoff blocker copy should describe duplicate active tablets explicitly',
  );
  assert.doesNotMatch(
    deviceDeploymentHandoffSource,
    /multiple non-retired tablets attached/,
    'handoff blocker copy should stop treating inactive or repair tablets as live-scope duplicates',
  );
  assert.match(
    deviceDeploymentHelperSource,
    /const normalizedPodId = normalizePodIdentifier\(registration\.podId\);[\s\S]*if \(!normalizedPodId \|\| normalizedStatus !== 'active'\) return accumulator;/,
    'shared rollout readiness helper should normalize pod ids before counting active duplicate live scope',
  );
  assert.match(
    deviceDeploymentHelperSource,
    /function normalizePodIdentifier\(value: string \| null \| undefined\)/,
    'shared rollout readiness helper should normalize pod ids the same way it normalizes device identifiers',
  );
  assert.match(
    deviceDeploymentHelperSource,
    /if \(!normalizeDeviceIdentifier\(registration\.deviceIdentifier\)\) reasons\.push\('missing-device-identifier'\);/,
    'shared rollout readiness helper should mark blank tablet identifiers as deployment blockers',
  );
  assert.match(
    deviceDeploymentHelperSource,
    /if \(normalizeDeviceIdentifier\(registration\.deviceIdentifier\) && duplicateDeviceIdentifierCount > 1\) reasons\.push\('duplicate-device-identifier'\);/,
    'shared rollout readiness helper should block duplicate live tablet identifiers before the dashboard reports a rollout-ready registration',
  );
  assert.match(
    deviceDeploymentHelperSource,
    /const blockingSummary = Object\.entries\(blockingReasonCounts\)/,
    'shared rollout readiness helper should expose a blocker summary so the dashboard can call out why every tablet is blocked without making ops infer it from the table',
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
