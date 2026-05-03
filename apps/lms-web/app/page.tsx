import Link from 'next/link';
import { DeploymentBlockerCard } from '../components/deployment-blocker-card';

export const dynamic = 'force-dynamic';

import { fetchAssetRuntime, fetchAssignments, fetchAssessments, fetchCurriculumModules, fetchDashboardInsights, fetchDashboardSummary, fetchLessons, fetchMallams, fetchSubjects, fetchWorkboard, isProtectedEndpointAuthFailure } from '../lib/api';
import { API_BASE_DIAGNOSTIC, API_BASE_SOURCE } from '../lib/config';
import { getBuildSignature } from '../lib/build-signature';
import { navigationItems } from '../lib/navigation';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../lib/ui';
import type { Assignment, Assessment, AssetRuntimeReport, CurriculumModule, DashboardInsight, DashboardSummary, Lesson, Mallam, Subject, WorkboardItem } from '../lib/types';
import { shouldBlockDashboardPage } from '../lib/dashboard-blockers';
import { diagnoseBackendTargetMismatch } from '../lib/backend-target-diagnosis';
import { getDashboardReleaseBlockers } from '../lib/dashboard-release';
import { resolveTopReleaseBlockerCta } from '../lib/dashboard-top-blocker';

const quickActionStyle = {
  borderRadius: 14,
  padding: '12px 14px',
  fontWeight: 800,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const emptySummary: DashboardSummary = {
  activeLearners: 0,
  lessonsCompleted: 0,
  centers: 0,
  syncSuccessRate: 0,
  mallams: 0,
  activePods: 0,
  activeAssignments: 0,
  assessmentsLive: 0,
  learnersReadyToProgress: 0,
};

function sectionAlert(message: string, tone: 'warning' | 'neutral' = 'neutral') {
  const styles = tone === 'warning'
    ? { background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412' }
    : { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' };

  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, lineHeight: 1.6, ...styles }}>
      {message}
    </div>
  );
}

function statusTone(status: string) {
  if (status === 'ready') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'watch') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '—';

  const normalized = value > 1 ? value : value * 100;
  const clamped = Math.max(0, Math.min(100, normalized));
  return `${Math.round(clamped)}%`;
}

function formatDueLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: Date) {
  return value.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeMinutes(value: Date) {
  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / (60 * 1000)));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function assignmentUrgency(value: string, status: string) {
  if (status === 'completed') return { label: 'Completed', tone: '#E5E7EB', text: '#334155' };

  const dueDate = startOfDay(new Date(value));
  if (Number.isNaN(dueDate.getTime())) return { label: 'Date unverified', tone: '#E5E7EB', text: '#475569' };

  const today = startOfDay(new Date());
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / dayMs);

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, tone: '#FEE2E2', text: '#991B1B' };
  if (diffDays === 0) return { label: 'Due today', tone: '#FEF3C7', text: '#92400E' };
  if (diffDays === 1) return { label: 'Due tomorrow', tone: '#FEF3C7', text: '#92400E' };
  if (diffDays <= 7) return { label: `Due in ${diffDays}d`, tone: '#E0E7FF', text: '#3730A3' };
  return { label: 'Upcoming', tone: '#F8FAFC', text: '#334155' };
}

function metricDisplay(value: string, available: boolean) {
  return available ? value : '—';
}

function describeReleaseRisk(blockerCount: number) {
  if (blockerCount >= 5) return { label: 'Critical release blocker', tone: '#FEE2E2', text: '#991B1B' };
  if (blockerCount >= 3) return { label: 'High release risk', tone: '#FEF3C7', text: '#92400E' };
  return { label: 'Moderate release risk', tone: '#E0E7FF', text: '#3730A3' };
}

function describeNextAction(module: {
  missingLessons: number;
  hasAssessmentGate: boolean;
  isDraftModule: boolean;
  hasAuthoringContext: boolean;
}) {
  const actions: string[] = [];

  if (module.isDraftModule) actions.push('move the module out of draft');
  if (module.missingLessons > 0) {
    actions.push(
      module.hasAuthoringContext
        ? `create ${module.missingLessons} missing lesson${module.missingLessons === 1 ? '' : 's'}`
        : `recover the subject context before creating ${module.missingLessons} missing lesson${module.missingLessons === 1 ? '' : 's'}`,
    );
  }
  if (!module.hasAssessmentGate) actions.push('add the assessment gate');

  if (!actions.length) return 'This lane is structurally clear.';

  return `${actions[0].charAt(0).toUpperCase()}${actions[0].slice(1)}${actions.length > 1 ? `, ${actions.slice(1, -1).join(', ')}${actions.length > 2 ? ',' : ''} and ${actions.at(-1)}` : ''} before publish.`;
}

function describeGateWarning(moduleCount: number, liveModuleCount: number) {
  if (!moduleCount) return 'Every visible release lane has an assessment gate. Leave it that way.';
  if (liveModuleCount > 0) {
    return `${moduleCount} module${moduleCount === 1 ? '' : 's'} ${moduleCount === 1 ? 'is' : 'are'} missing a progression gate, including ${liveModuleCount} non-draft module${liveModuleCount === 1 ? '' : 's'} that already look close enough to assign. Freeze assignment until the gate exists.`;
  }

  return `${moduleCount} draft module${moduleCount === 1 ? '' : 's'} ${moduleCount === 1 ? 'is' : 'are'} still missing a progression gate. Fix that before anybody gets cute with publish state.`;
}

function dashboardApiSourceDetail() {
  if (API_BASE_SOURCE === 'missing-production-env') {
    return {
      label: 'Missing production API env',
      note: `Dashboard is intentionally blocked until NEXT_PUBLIC_API_BASE_URL is set to a real HTTPS host such as ${API_BASE_DIAGNOSTIC.expectedFormat}.`,
      tone: { background: '#FEE2E2', border: '1px solid #FCA5A5', text: '#991B1B' },
    };
  }

  if (API_BASE_SOURCE === 'env') {
    return {
      label: 'Explicit production API',
      note: API_BASE_DIAGNOSTIC.configuredApiBase
        ? `Dashboard is pointed at ${API_BASE_DIAGNOSTIC.configuredApiBase}. This is the host deployment review is actually validating.`
        : 'Dashboard is using an explicitly configured production API host.',
      tone: { background: '#DCFCE7', border: '1px solid #86EFAC', text: '#166534' },
    };
  }

  return {
    label: 'Local development API',
    note: 'Dashboard is using the local development API fallback. Fine for local work, not a deployment signal.',
    tone: { background: '#E5E7EB', border: '1px solid #CBD5E1', text: '#334155' },
  };
}

function assetReadinessTone(readiness: AssetRuntimeReport['summary']['readiness']) {
  if (readiness === 'blocked') return { background: '#FEE2E2', border: '1px solid #FCA5A5', text: '#991B1B' };
  if (readiness === 'degraded') return { background: '#FFF7ED', border: '1px solid #FDBA74', text: '#9A3412' };
  return { background: '#ECFDF5', border: '1px solid #BBF7D0', text: '#166534' };
}

function describeApiTarget() {
  return API_BASE_DIAGNOSTIC.configuredApiBase ?? 'Not configured';
}

export default async function HomePage() {
  const buildSignature = getBuildSignature();
  const apiTarget = describeApiTarget();
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Dashboard"
        subtitle="The admin landing page is intentionally blocked until the production LMS is wired to a real, production-safe API."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: dashboard API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code>{' '}
            {API_BASE_SOURCE === 'missing-production-env'
              ? 'is missing in production.'
              : 'is present, but the current value is not production-safe.'}{' '}
            {API_BASE_DIAGNOSTIC.blockerDetail} Treating that as healthy would let a broken deployment masquerade as a live admin dashboard.
          </>
        )}
        whyBlocked={[
          'The root route is the first thing deployment reviewers and operators see. If it implies the dashboard is healthy while the API is missing, placeholder-only, or pointed at localhost, every downstream sign-off becomes suspect.',
          'Dashboard counts drive escalation: who is ready, who is slipping, and whether mallam + pod coverage actually exists right now.',
          'A quiet empty-state admin landing is worse than a loud blocker because it invites bad operational decisions.',
        ]}
        verificationItems={[
          {
            surface: 'Dashboard summary',
            expected: 'Active learners, assignments, pods, assessments, and ready-to-progress counts reflect live API data',
            failure: 'Zeroed or placeholder cards that look valid even when the backend is unreachable',
          },
          {
            surface: 'Priority queue',
            expected: 'Ready/watch learners load from the live workboard with real next-module recommendations',
            failure: 'No intervention rows even though student/progress pages show active learners',
          },
          {
            surface: 'Configured API base URL',
            expected: `Uses a real HTTPS production host such as ${API_BASE_DIAGNOSTIC.expectedFormat}`,
            failure: `Placeholder, localhost, invalid, or non-HTTPS value${API_BASE_DIAGNOSTIC.configuredApiBase ? ` like ${API_BASE_DIAGNOSTIC.configuredApiBase}` : ''}`,
          },
        ]}
        fixItems={[
          { label: 'Frontend build', value: buildSignature.summary },
          { label: 'Current API target', value: apiTarget },
          { label: 'Deployment action', value: 'Set NEXT_PUBLIC_API_BASE_URL to the real HTTPS API origin, redeploy the LMS, then re-check the root dashboard.' },
        ]}
        docs={[
          { label: 'Deploy checklist', href: '/DEPLOY_VERIFICATION_CHECKLIST.html', background: '#111827', color: '#FFFFFF', border: '1px solid #1F2937' },
          { label: 'Content blocker', href: '/content', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Assignments blocker', href: '/assignments', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
          { label: 'Settings blocker', href: '/settings', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
        ]}
      />
    );
  }

  const [summaryResult, insightsResult, workboardResult, mallamsResult, assignmentsResult, modulesResult, lessonsResult, assessmentsResult, assetRuntimeResult, subjectsResult] = await Promise.allSettled([
    fetchDashboardSummary(),
    fetchDashboardInsights(),
    fetchWorkboard(),
    fetchMallams(),
    fetchAssignments(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
    fetchAssetRuntime(8),
    fetchSubjects(),
  ]);

  const summary: DashboardSummary = summaryResult.status === 'fulfilled' ? summaryResult.value : emptySummary;
  const summaryAvailable = summaryResult.status === 'fulfilled';
  const insights: DashboardInsight[] = insightsResult.status === 'fulfilled' ? insightsResult.value : [];
  const workboard: WorkboardItem[] = workboardResult.status === 'fulfilled' ? workboardResult.value : [];
  const workboardAvailable = workboardResult.status === 'fulfilled';
  const mallams: Mallam[] = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const mallamsAvailable = mallamsResult.status === 'fulfilled';
  const assignments: Assignment[] = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  const assignmentsAvailable = assignmentsResult.status === 'fulfilled';
  const modules: CurriculumModule[] = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons: Lesson[] = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const assessments: Assessment[] = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const subjects: Subject[] = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const assetRuntime = assetRuntimeResult.status === 'fulfilled' ? assetRuntimeResult.value : null;
  const assetOpsVisibleBlocker = Boolean(
    assetRuntime && (
      assetRuntime.summary.readiness === 'blocked'
      || !assetRuntime.summary.registryHealthy
      || !assetRuntime.uploads.ready
      || assetRuntime.summary.brokenManagedReferenceCount > 0
      || assetRuntime.summary.unresolvedReferenceCount > 0
    ),
  );
  const assetOpsCriticalFailure = assetRuntimeResult.status === 'rejected'
    ? 'asset runtime'
    : assetOpsVisibleBlocker
      ? 'asset operations'
      : null;
  const dashboardRenderedAt = new Date();

  const failedFeedEntries = [
    { label: 'dashboard summary', result: summaryResult },
    { label: 'insights', result: insightsResult },
    { label: 'workboard', result: workboardResult },
    { label: 'mallams', result: mallamsResult },
    { label: 'assignments', result: assignmentsResult },
    { label: 'modules', result: modulesResult },
    { label: 'lessons', result: lessonsResult },
    { label: 'assessments', result: assessmentsResult },
    { label: 'asset runtime', result: assetRuntimeResult },
    { label: 'subjects', result: subjectsResult },
  ].filter(
    (entry): entry is { label: string; result: PromiseRejectedResult } => entry.result.status === 'rejected',
  );
  const failedSources = failedFeedEntries.map((entry) => entry.label);
  const assetRuntimeAuthBlocked = assetRuntimeResult.status === 'rejected' && isProtectedEndpointAuthFailure(assetRuntimeResult.reason);
  const backendTargetDiagnosis = diagnoseBackendTargetMismatch(
    failedFeedEntries.map((entry) => ({ label: entry.label, error: entry.result.reason })),
  );
  const subjectFeedAvailable = subjectsResult.status === 'fulfilled';
  const criticalDashboardFailures = [
    !summaryAvailable ? 'dashboard summary' : null,
    !workboardAvailable ? 'workboard' : null,
    !mallamsAvailable ? 'mallams' : null,
    !assignmentsAvailable ? 'assignments' : null,
  ].filter(Boolean) as string[];
  const criticalReleaseFailures = [
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    assetRuntimeResult.status === 'rejected' && !assetRuntimeAuthBlocked ? 'asset runtime' : null,
  ].filter(Boolean) as string[];
  const hasCriticalAssetOpsGap = Boolean(assetOpsCriticalFailure);
  const healthyFeedCount = 10 - failedSources.length;
  const dashboardTrustBadge = criticalDashboardFailures.length || criticalReleaseFailures.length || hasCriticalAssetOpsGap
    ? 'Blocked'
    : failedSources.length
      ? 'Partial live pull'
      : 'Fresh live pull';
  const dashboardTrustTone = criticalDashboardFailures.length || criticalReleaseFailures.length || hasCriticalAssetOpsGap
    ? { tone: '#FEE2E2', text: '#991B1B' }
    : failedSources.length
      ? { tone: '#FEF3C7', text: '#92400E' }
      : { tone: '#DCFCE7', text: '#166534' };

  const readyLearners = workboard.filter((item) => item.progressionStatus === 'ready');
  const watchLearners = workboard.filter((item) => item.progressionStatus === 'watch');
  const priorityQueue = [...watchLearners, ...readyLearners];
  const activeMallams = mallams.filter((mallam) => mallam.status === 'active');
  const hasCriticalDashboardGap = criticalDashboardFailures.length > 0;
  const apiSourceDetail = dashboardApiSourceDetail();
  const dueSoonAssignments = assignments
    .filter((assignment) => assignment.status !== 'completed')
    .slice()
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
    .slice(0, 5);
  const releaseBlockers = getDashboardReleaseBlockers({
    modules,
    lessons,
    assessments,
    subjects,
  });
  const releaseFeedsAvailable = modulesResult.status === 'fulfilled' && lessonsResult.status === 'fulfilled' && assessmentsResult.status === 'fulfilled';
  const draftModuleBlockers = releaseBlockers.filter((module) => module.isDraftModule);
  const missingGateBlockers = releaseBlockers.filter((module) => !module.hasAssessmentGate);
  const liveMissingGateBlockers = missingGateBlockers.filter((module) => !module.isDraftModule);
  const publishReadyModules = Math.max(modules.length - releaseBlockers.length, 0);
  const topReleaseBlocker = releaseBlockers[0] ?? null;
  const topReleaseBlockerBoardHref = topReleaseBlocker
    ? `/content?view=blocked${topReleaseBlocker.subjectId ? `&subject=${encodeURIComponent(topReleaseBlocker.subjectId)}` : ''}&q=${encodeURIComponent(topReleaseBlocker.title)}`
    : '/content?view=blocked';
  const topReleaseBlockerSubjectMetadataMissing = Boolean(
    topReleaseBlocker?.missingLessons
    && !topReleaseBlocker.hasAuthoringContext
    && !subjectFeedAvailable,
  );
  const topReleaseBlockerCta = topReleaseBlocker
    ? resolveTopReleaseBlockerCta({
        missingLessons: topReleaseBlocker.missingLessons,
        hasAuthoringContext: topReleaseBlocker.hasAuthoringContext,
        subjectMetadataDegraded: topReleaseBlockerSubjectMetadataMissing,
      })
    : null;
  const canLaunchTopReleaseLessonCreate = Boolean(topReleaseBlockerCta?.canLaunchLessonStudio && topReleaseBlocker);
  const topReleaseBlockerPrimaryHref = canLaunchTopReleaseLessonCreate && topReleaseBlocker
    ? `/content/lessons/new?subjectId=${encodeURIComponent(topReleaseBlocker.subjectId)}&moduleId=${encodeURIComponent(topReleaseBlocker.id)}&from=${encodeURIComponent(topReleaseBlockerBoardHref)}&focus=blockers`
    : topReleaseBlockerBoardHref;
  const topReleaseBlockerPrimaryLabel = topReleaseBlockerCta?.label ?? 'Open exact blocker';

  if (shouldBlockDashboardPage({
    criticalDashboardFailureCount: criticalDashboardFailures.length,
    criticalReleaseFailureCount: criticalReleaseFailures.length,
    hasCriticalAssetOpsGap,
  })) {
    const blockerDetail = backendTargetDiagnosis
      ? `Multiple LMS feeds are returning route-level 404 responses from ${API_BASE_DIAGNOSTIC.configuredApiBase ?? 'the configured API host'}. That pattern usually means this deployment is pointed at a stale or wrong backend build, not that the dashboard suddenly forgot how to fetch. Failing route checks: ${backendTargetDiagnosis.requestUrls.join(', ')}.`
      : hasCriticalDashboardGap
        ? !summaryAvailable && !workboardAvailable && !mallamsAvailable && !assignmentsAvailable
          ? 'Dashboard summary, progression workboard, mallam coverage, and assignment pressure all failed to load from the live API. Leaving the root route up with empty metrics would turn an outage into a fake sign-off surface.'
          : !summaryAvailable && !workboardAvailable
            ? 'Both the dashboard summary and progression workboard failed to load from the live API. Leaving the root route up with empty metrics would turn an outage into a fake sign-off surface.'
            : !summaryAvailable
              ? 'The dashboard summary feed failed to load from the live API. Without top-line counts, this route cannot honestly represent learner activity, pod coverage, or deployment readiness.'
              : !workboardAvailable
                ? 'The progression workboard failed to load from the live API. Without the live intervention queue, this route cannot honestly show who is ready, blocked, or quietly slipping.'
                : !mallamsAvailable && !assignmentsAvailable
                  ? 'Mallam coverage and assignment pressure both failed to load from the live API. That strips out the facilitator and delivery checks operators use before trusting this dashboard.'
                  : !mallamsAvailable
                    ? 'The mallam coverage feed failed to load from the live API. Without the live roster, this dashboard cannot honestly represent facilitator coverage.'
                    : 'The assignment pressure feed failed to load from the live API. Without the live delivery queue, this dashboard cannot honestly represent workload or due-soon risk.'
        : hasCriticalAssetOpsGap
        ? assetRuntimeResult.status === 'rejected'
          ? assetRuntimeAuthBlocked
            ? 'The dashboard cannot read the protected asset runtime audit because the LMS is missing or using the wrong admin API key. Until that auth wiring is fixed, this route cannot honestly prove upload readiness, registry integrity, or managed lesson media health.'
            : 'The asset runtime audit failed to load from the live API. That leaves the dashboard unable to prove whether uploads, registry integrity, and managed lesson media are actually usable for live content operations.'
          : 'The asset runtime audit is live, and it is telling you asset operations are blocked. A dashboard that still looks deployable while uploads or managed lesson references are broken is lying by omission.'
        : !modules.length && !lessons.length && !assessments.length
          ? 'The dashboard release-readiness lane cannot see modules, lessons, or assessment gates from the live API. Keeping the root route up would turn the “content release blockers” section into polished fiction.'
          : criticalReleaseFailures.length === 1
            ? `The ${criticalReleaseFailures[0]} feed failed to load from the live API. That leaves the dashboard unable to verify release blockers honestly.`
            : `The ${criticalReleaseFailures.join(', ')} feeds failed to load from the live API. That leaves the dashboard unable to verify release blockers honestly.`;

    return (
      <DeploymentBlockerCard
        title="Dashboard"
        subtitle={backendTargetDiagnosis
          ? 'The admin landing page is blocked because the configured API host looks like the wrong or stale backend build.'
          : hasCriticalDashboardGap
            ? 'The admin landing page stays blocked when the critical live dashboard feeds are down.'
            : hasCriticalAssetOpsGap
              ? 'The admin landing page also blocks when asset operations are unavailable or visibly broken.'
              : 'The admin landing page also blocks when release-readiness feeds are blind.'}
        blockerHeadline={backendTargetDiagnosis
          ? 'Deployment blocker: LMS is pointed at a stale or wrong backend host.'
          : hasCriticalDashboardGap
            ? 'Deployment blocker: dashboard live feeds are degraded.'
            : hasCriticalAssetOpsGap
              ? assetRuntimeAuthBlocked
                ? 'Deployment blocker: LMS admin API key cannot unlock asset audit feeds.'
                : 'Deployment blocker: asset operations are not trustworthy.'
              : 'Deployment blocker: release-readiness feeds are degraded.'}
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length
              ? `Failed feed${failedSources.length === 1 ? '' : 's'}: ${failedSources.join(', ')}.`
              : 'The dashboard refused to guess.'}
          </>
        )}
        whyBlocked={backendTargetDiagnosis
          ? [
              'The failure pattern matches route-level 404s across multiple LMS feeds. That usually means the host behind NEXT_PUBLIC_API_BASE_URL is stale or simply the wrong service, not that one dashboard card had a bad day.',
              'If the front door only says “feeds degraded,” deployment reviewers waste time poking the UI while the real problem sits behind the API hostname.',
              'Calling out a likely wrong backend directly is safer than making operators reverse-engineer 404 patterns from scattered empty states.',
            ]
          : hasCriticalDashboardGap
            ? [
                'The root route is the deployment reviewer’s first trust check. If summary, progression, mallam coverage, or assignment pressure is missing, the page should not cosplay as a healthy command center.',
                'Operators use this screen to decide who needs intervention now, whether facilitators are actually covered, and whether delivery load is under control. Missing any of those turns this into vibes-based operations.',
                'A loud blocker is safer than polished blanks, fake zeros, or “looks mostly fine” cards during an outage.',
              ]
            : hasCriticalAssetOpsGap
            ? assetRuntimeAuthBlocked
              ? [
                  'The dashboard now depends on protected audit feeds to prove whether asset operations are genuinely healthy. If the LMS cannot authenticate to those endpoints, the front door should block instead of hand-waving.',
                  'A missing or wrong LUMO_ADMIN_API_KEY can look like a mysterious asset outage even when the backend is fine. Reviewers need the route to say that plainly.',
                  'A loud auth blocker is safer than shipping a dashboard that implies lesson media is trustworthy while its protected audits are still locked.',
                ]
              : [
                  'This deployment depends on shared lesson media, upload integrity, and managed asset references. If those are broken, the front door should not pretend deployment is fine.',
                  'Operators use the dashboard as a trust signal before validating learner content paths. Broken asset operations mean lessons can still fail even if top-line counts look healthy.',
                  'A loud blocker is safer than shipping a dashboard that hides dead uploads, broken registry state, or stale backend media references.',
                ]
            : [
                'The dashboard now carries content release-readiness decisions, not just top-line learner metrics. If modules, lesson gaps, or assessment gates are blind, the route should not imply anyone can trust the release board.',
                'The “content release blockers” section drives assignment freeze, missing-lesson follow-up, and progression-gate checks. Leaving it up with degraded data invites a false green light.',
                'A blocker is safer than a dashboard that looks live while the release gate inputs are missing.',
              ]}
        verificationItems={hasCriticalDashboardGap
          ? [
              {
                surface: 'Dashboard summary',
                expected: 'Active learners, assignments, pods, assessments, and readiness counts load from the live API',
                failure: 'Zeroed or missing metrics on the root route',
              },
              {
                surface: 'Progression queue',
                expected: 'Ready/watch learners and next-module recommendations load from the live workboard',
                failure: 'No intervention queue or only empty-state fallback copy',
              },
              {
                surface: 'Coverage + flow readout',
                expected: 'Mallam coverage and due-soon assignment pressure reflect live roster + assignment feeds',
                failure: 'Dashboard still looks deployable even though facilitator coverage or delivery pressure is unknown',
              },
            ]
          : hasCriticalAssetOpsGap
            ? [
                {
                  surface: 'Asset operations readiness',
                  expected: 'Upload readiness, registry health, and managed-reference counts show a clean live state',
                  failure: 'Dashboard still looks deployable while uploads are blocked or registry integrity is broken',
                },
                {
                  surface: 'Lesson media pipeline',
                  expected: 'Managed lesson assets resolve cleanly without broken or unresolved references',
                  failure: 'Live lessons can silently lose media even though the root route still looks green',
                },
                {
                  surface: 'Cross-check routes',
                  expected: '/content/assets and /settings agree with the dashboard asset readiness call after recovery',
                  failure: 'Dashboard implies deployment is safe while asset tooling still shows blocked or degraded operations',
                },
              ]
            : [
                {
                  surface: 'Content release blockers',
                  expected: 'Blocked-module counts, missing lesson gaps, and assessment-gate warnings load from live curriculum feeds',
                  failure: 'Release-readiness card renders with warnings or partial counts while modules / lessons / assessments are unavailable',
                },
                {
                  surface: 'Top blocker lane',
                  expected: 'Open blockers board and create-missing-lesson actions are based on real module + lesson + gate data',
                  failure: 'A module appears release-safe or actionable while one of the release feeds is blind',
                },
                {
                  surface: 'Cross-check routes',
                  expected: '/content and /assignments agree with the root release-readiness board after recovery',
                  failure: 'Dashboard says release is reviewable while the live content and delivery routes still show degraded curriculum or assignment data',
                },
              ]}
        fixItems={backendTargetDiagnosis
          ? [
              { label: 'Frontend build', value: buildSignature.summary },
              { label: 'Current API target', value: apiTarget },
              { label: 'Likely cause', value: 'NEXT_PUBLIC_API_BASE_URL points at a stale or wrong backend build' },
              { label: 'Failing feeds', value: backendTargetDiagnosis.failingFeeds.join(', ') },
              { label: 'Operator action', value: 'Verify the API host serves current /api/v1/* and admin runtime routes, then redeploy the LMS if the env target changes' },
            ]
          : hasCriticalDashboardGap
            ? [
                { label: 'Frontend build', value: buildSignature.summary },
                { label: 'Current API target', value: apiTarget },
                { label: 'Failing feeds', value: criticalDashboardFailures.length ? criticalDashboardFailures.join(', ') : 'dashboard summary, workboard, mallams, assignments' },
                { label: 'Operator action', value: 'Restore the critical live feeds before using this route as a release signal' },
                { label: 'Cross-check', value: 'Verify /progress, /assignments, and the dashboard facilitator-coverage cards after the upstream fix lands' },
              ]
            : hasCriticalAssetOpsGap
            ? assetRuntimeAuthBlocked
              ? [
                  { label: 'Frontend build', value: buildSignature.summary },
                  { label: 'Current API target', value: apiTarget },
                  { label: 'Failing area', value: 'protected asset runtime audit authentication' },
                  { label: 'Operator action', value: 'Set the correct LUMO_ADMIN_API_KEY in the LMS deployment so protected audit endpoints can answer' },
                  { label: 'Cross-check', value: 'Verify /settings and /content/assets stop 401ing before trusting the dashboard again' },
                ]
              : [
                  { label: 'Frontend build', value: buildSignature.summary },
                  { label: 'Current API target', value: apiTarget },
                  { label: 'Failing area', value: assetOpsCriticalFailure ?? 'asset operations' },
                  { label: 'Operator action', value: 'Restore upload readiness, registry integrity, and managed asset references before trusting the dashboard' },
                  { label: 'Cross-check', value: 'Verify /content/assets and /settings after the asset pipeline fix lands' },
                ]
            : [
                { label: 'Frontend build', value: buildSignature.summary },
                { label: 'Current API target', value: apiTarget },
                { label: 'Failing feeds', value: criticalReleaseFailures.length ? criticalReleaseFailures.join(', ') : 'modules, lessons, assessments' },
                { label: 'Operator action', value: 'Restore curriculum + release-gate feeds before trusting the dashboard release board' },
                { label: 'Cross-check', value: 'Verify /content, /assignments, and /settings after the upstream fix lands' },
              ]}
        docs={backendTargetDiagnosis
          ? [
              { label: 'Deploy verification guide', href: '/LUMO_MVP_QA_UAT_GUIDE.html', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
              { label: 'Open settings', href: '/settings', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
              { label: 'Open content board', href: '/content', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
            ]
          : hasCriticalDashboardGap
            ? [
                { label: 'Check progress feed', href: '/progress', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
                { label: 'Open content board', href: '/content', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
                { label: 'Open assignments', href: '/assignments', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
              ]
            : hasCriticalAssetOpsGap
            ? [
                { label: 'Open asset library', href: '/content/assets', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
                { label: 'Open settings', href: '/settings', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
                { label: 'Cross-check content', href: '/content', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
              ]
            : [
                { label: 'Check content board', href: '/content', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
                { label: 'Open assignments', href: '/assignments', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
                { label: 'Cross-check progress', href: '/progress', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
              ]}
      />
    );
  }

  return (
    <PageShell
      title="Dashboard"
      subtitle="The live admin landing page for learner risk, progression readiness, mallam coverage, and assignment flow."
      aside={(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/settings" style={{ ...quickActionStyle, background: '#111827', color: 'white' }}>
            Open settings
          </Link>
          <Link href="/content" style={{ ...quickActionStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Open content
          </Link>
          <Link href="/assignments" style={{ ...quickActionStyle, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' }}>
            Open assignments
          </Link>
          <Link href="/progress" style={{ ...quickActionStyle, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>
            Open progress
          </Link>
        </div>
      )}
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 16 }}>
          {sectionAlert(`Dashboard is running in degraded mode: ${failedSources.join(', ')} ${failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.`, 'warning')}
        </div>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <div style={{ padding: '18px 20px', borderRadius: 20, background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)', border: '1px solid #e2e8f0', display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8a94a6', fontWeight: 800 }}>Command center</div>
              <strong style={{ fontSize: 22, color: '#0f172a' }}>Deployment health at a glance</strong>
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                {hasCriticalDashboardGap
                  ? 'Critical dashboard feeds are down, so deployment review is blocked until summary, progression, facilitator coverage, and assignment pressure are trustworthy again.'
                  : failedSources.length
                    ? 'Some dashboard feeds are degraded, so use the route links below to verify detail before acting.'
                    : 'Use this page to spot who needs intervention, who is ready to progress, and whether facilitators are actually covered.'}
              </div>
            </div>
            <Pill
              label={hasCriticalDashboardGap ? 'Deployment review blocked' : failedSources.length ? 'Degraded feed' : 'Live feed'}
              tone={hasCriticalDashboardGap ? '#FEE2E2' : failedSources.length ? '#FEF3C7' : '#DCFCE7'}
              text={hasCriticalDashboardGap ? '#991B1B' : failedSources.length ? '#92400E' : '#166534'}
            />
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 18, ...apiSourceDetail.tone, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ color: apiSourceDetail.tone.text }}>Backend trust</strong>
              <Pill label={apiSourceDetail.label} tone="#FFFFFF" text={apiSourceDetail.tone.text} />
            </div>
            <div style={{ color: apiSourceDetail.tone.text, lineHeight: 1.6 }}>{apiSourceDetail.note}</div>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 18, background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ color: '#0f172a' }}>Live pull freshness</strong>
              <Pill label={dashboardTrustBadge} tone={dashboardTrustTone.tone} text={dashboardTrustTone.text} />
            </div>
            <div style={{ color: '#334155', lineHeight: 1.6 }}>
              Rendered {formatRelativeMinutes(dashboardRenderedAt)} at {formatDateTime(dashboardRenderedAt)} with {healthyFeedCount}/10 dashboard feeds responding.
              {failedSources.length ? ` Missing or degraded: ${failedSources.join(', ')}.` : ' No missing feeds detected in this pull.'}
            </div>
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>
              If this timestamp is already old by the time someone screenshots the page, the dashboard should be treated as a stale briefing, not a deployment sign-off.
            </div>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 18, background: '#0F172A', border: '1px solid #1E293B', display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong style={{ color: 'white' }}>Deployment trace</strong>
              <Pill label={buildSignature.commitShort} tone="#EEF2FF" text="#3730A3" />
            </div>
            <div style={{ color: '#CBD5E1', lineHeight: 1.6 }}>
              Frontend build: {buildSignature.summary}
            </div>
            <div style={{ color: '#E2E8F0', lineHeight: 1.6 }}>
              API target: <code style={{ color: 'white', fontWeight: 800 }}>{apiTarget}</code>
            </div>
            <div style={{ color: '#94A3B8', lineHeight: 1.6 }}>
              When reviewers think they are staring at a stale deploy, these two facts should be visible without opening DevTools or guessing which environment won the roulette wheel.
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        {[
          {
            label: 'Active learners',
            value: metricDisplay(String(summary.activeLearners), summaryAvailable),
            note: summaryAvailable
              ? 'Learners currently visible to the admin surface'
              : 'Unavailable until the live dashboard summary feed recovers.',
          },
          {
            label: 'Ready to progress',
            value: metricDisplay(String(summary.learnersReadyToProgress), summaryAvailable),
            note: summaryAvailable
              ? 'Pulled from the live progression workboard'
              : 'Unavailable until the live dashboard summary feed recovers.',
          },
          {
            label: 'Active assignments',
            value: metricDisplay(String(summary.activeAssignments), summaryAvailable),
            note: summaryAvailable
              ? 'Delivery workload still in flight'
              : 'Unavailable until the live dashboard summary feed recovers.',
          },
          {
            label: 'Sync success',
            value: metricDisplay(formatPercent(summary.syncSuccessRate), summaryAvailable),
            note: summaryAvailable
              ? 'Dashboard transport confidence, not vibes'
              : 'Unavailable until the live dashboard summary feed recovers.',
          },
          {
            label: 'Active pods',
            value: metricDisplay(String(summary.activePods), summaryAvailable),
            note: summaryAvailable
              ? 'Pods currently represented in the live feed'
              : 'Unavailable until the live dashboard summary feed recovers.',
          },
          {
            label: 'Assessments live',
            value: metricDisplay(String(summary.assessmentsLive), summaryAvailable),
            note: summaryAvailable
              ? 'Assessment gates available to operators now'
              : 'Unavailable until the live dashboard summary feed recovers.',
          },
        ].map((item) => (
          <Card key={item.label} title={item.value} eyebrow={item.label}>
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>{item.note}</div>
          </Card>
        ))}
      </section>

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Content release snapshot" eyebrow="Deployment handoff">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800 }}>Blocked modules</div>
              <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{releaseFeedsAvailable ? releaseBlockers.length : '—'}</div>
              <div style={{ marginTop: 6, color: '#64748b', lineHeight: 1.6 }}>
                {releaseFeedsAvailable
                  ? releaseBlockers.length
                    ? `${draftModuleBlockers.length} draft module${draftModuleBlockers.length === 1 ? '' : 's'} still need authoring follow-up. Open Content Library for the real blocker workflow.`
                    : 'No release blockers are visible in the live curriculum feeds. Open Content Library if you want the detailed board.'
                  : 'Curriculum release feeds are unavailable, so the dashboard is intentionally showing only a handoff summary.'}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {[
                { label: 'Publish-ready modules', value: releaseFeedsAvailable ? String(publishReadyModules) : '—' },
                { label: 'Draft modules blocking', value: releaseFeedsAvailable ? String(draftModuleBlockers.length) : '—' },
                { label: 'Missing lesson gaps', value: releaseFeedsAvailable ? String(releaseBlockers.reduce((sum, module) => sum + module.missingLessons, 0)) : '—' },
                { label: 'Missing gates', value: releaseFeedsAvailable ? String(releaseBlockers.filter((module) => !module.hasAssessmentGate).length) : '—' },
              ].map((item) => (
                <div key={item.label} style={{ padding: '12px 14px', borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {!releaseFeedsAvailable ? sectionAlert('Modules, lessons, or assessments failed to load. Open Content Library after the feeds recover; the dashboard will not pretend to be the blocker board.', 'warning') : null}
            {releaseFeedsAvailable && !subjectFeedAvailable ? sectionAlert('Subject metadata is degraded, but the dashboard can still launch Lesson Studio when the module itself carries enough subject context to recover the authoring lane. Use Content Library if you need the full blocker board.', 'warning') : null}
            {releaseFeedsAvailable && topReleaseBlocker ? (
              <div style={{ padding: '16px 18px', borderRadius: 18, background: '#fff7ed', border: '1px solid #fed7aa', display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#9A3412', fontWeight: 800 }}>Release handoff</div>
                    <strong style={{ color: '#7C2D12', fontSize: 18 }}>{topReleaseBlocker.title}</strong>
                    <div style={{ color: '#9A3412', lineHeight: 1.6 }}>
                      {topReleaseBlocker.subjectName !== '—'
                        ? `${topReleaseBlocker.subjectName} · `
                        : ''}
                      {describeNextAction(topReleaseBlocker)}
                    </div>
                  </div>
                  <Pill
                    label={describeReleaseRisk(topReleaseBlocker.blockerCount).label}
                    tone={describeReleaseRisk(topReleaseBlocker.blockerCount).tone}
                    text={describeReleaseRisk(topReleaseBlocker.blockerCount).text}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {topReleaseBlocker.missingLessons > 0 ? (
                    <Pill
                      label={`${topReleaseBlocker.missingLessons} missing lesson${topReleaseBlocker.missingLessons === 1 ? '' : 's'}`}
                      tone="#FFF"
                      text="#9A3412"
                    />
                  ) : null}
                  {!topReleaseBlocker.hasAssessmentGate ? (
                    <Pill label="Assessment gate missing" tone="#FFF" text="#9A3412" />
                  ) : null}
                  {topReleaseBlocker.isDraftModule ? (
                    <Pill label="Still in draft" tone="#FFF" text="#9A3412" />
                  ) : null}
                </div>
                <div style={{ color: '#9A3412', lineHeight: 1.6 }}>
                  {canLaunchTopReleaseLessonCreate
                    ? 'The dashboard only flags the ugliest lane. Actual curriculum action stays in Content Library so operators do not end up juggling two competing release boards.'
                    : topReleaseBlockerSubjectMetadataMissing
                      ? 'The subject feed is degraded, so the dashboard refuses to guess its way into Lesson Studio from partial metadata. Re-open the scoped blocker board first, then launch authoring from the real content surface.'
                      : 'This lane is missing recoverable subject context, so the dashboard refuses to fire operators into Lesson Studio and sends them back to the blocker board to repair the lane first.'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href={topReleaseBlockerPrimaryHref} style={{ ...quickActionStyle, background: '#9A3412', color: 'white', padding: '10px 12px' }}>
                    {topReleaseBlockerPrimaryLabel}
                  </Link>
                  <Link href={topReleaseBlockerBoardHref} style={{ ...quickActionStyle, background: '#fff', color: '#9A3412', border: '1px solid #FED7AA', padding: '10px 12px' }}>
                    Open scoped blocker board
                  </Link>
                  <Link href="/content" style={{ ...quickActionStyle, background: '#fff', color: '#9A3412', border: '1px solid #FED7AA', padding: '10px 12px' }}>
                    Open Content Library
                  </Link>
                </div>
              </div>
            ) : null}
            {assetRuntime ? (
              <div style={{ ...assetReadinessTone(assetRuntime.summary.readiness), padding: '16px 18px', borderRadius: 18, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, fontWeight: 800, color: assetReadinessTone(assetRuntime.summary.readiness).text }}>Asset operations readiness</div>
                    <strong style={{ fontSize: 18, color: assetReadinessTone(assetRuntime.summary.readiness).text }}>{assetRuntime.summary.headline}</strong>
                    <div style={{ color: assetReadinessTone(assetRuntime.summary.readiness).text, lineHeight: 1.6 }}>
                      {assetOpsVisibleBlocker
                        ? `${assetRuntime.summary.operatorAction} Do not let a deployment reviewer mistake a broken asset registry for “content is ready anyway.”`
                        : 'Shared media registry, uploads, and reference integrity look usable from the runtime audit. Keep it that way.'}
                    </div>
                  </div>
                  <Pill
                    label={assetRuntime.summary.readiness}
                    tone={assetReadinessTone(assetRuntime.summary.readiness).background}
                    text={assetReadinessTone(assetRuntime.summary.readiness).text}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Pill label={`${assetRuntime.registry.usableRecords} usable asset${assetRuntime.registry.usableRecords === 1 ? '' : 's'}`} tone="#FFF" text={assetReadinessTone(assetRuntime.summary.readiness).text} />
                  <Pill label={`${assetRuntime.summary.brokenManagedReferenceCount} broken managed ref${assetRuntime.summary.brokenManagedReferenceCount === 1 ? '' : 's'}`} tone="#FFF" text={assetReadinessTone(assetRuntime.summary.readiness).text} />
                  <Pill label={`${assetRuntime.summary.unresolvedReferenceCount} unresolved lesson ref${assetRuntime.summary.unresolvedReferenceCount === 1 ? '' : 's'}`} tone="#FFF" text={assetReadinessTone(assetRuntime.summary.readiness).text} />
                  <Pill label={assetRuntime.uploads.ready ? 'Uploads writable' : 'Uploads blocked'} tone="#FFF" text={assetReadinessTone(assetRuntime.summary.readiness).text} />
                </div>
                <div style={{ color: assetReadinessTone(assetRuntime.summary.readiness).text, lineHeight: 1.6 }}>
                  {assetRuntime.routeEvidence?.ready
                    ? `${assetRuntime.routeEvidence.mountedCount}/${assetRuntime.routeEvidence.expectedCount} critical asset routes are mounted in this API build. If the library UI is still failing, you are probably staring at a stale backend target or proxy damage, not missing source code.`
                    : 'The runtime audit cannot prove the asset routes are mounted cleanly in this API build yet. Treat that as a release smell until settings or the asset board says otherwise.'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href="/content/assets" style={{ ...quickActionStyle, background: assetReadinessTone(assetRuntime.summary.readiness).text, color: 'white', padding: '10px 12px' }}>
                    Open asset library
                  </Link>
                  <Link href="/settings" style={{ ...quickActionStyle, background: '#fff', color: assetReadinessTone(assetRuntime.summary.readiness).text, border: `1px solid ${assetReadinessTone(assetRuntime.summary.readiness).text}`, padding: '10px 12px' }}>
                    Open settings + config audit
                  </Link>
                </div>
              </div>
            ) : sectionAlert('Asset runtime diagnostics are unavailable right now. That means the dashboard cannot honestly tell you whether the shared media registry is ready for live content ops.', 'warning')}
            <div style={{ padding: '16px 18px', borderRadius: 18, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ color: '#3730A3' }}>Curriculum action lives in Content Library</strong>
                <span style={{ color: '#4338CA', lineHeight: 1.6 }}>
                  The dashboard stays a thin admin front door: scan the counts here, then use Content Library for blocker triage, lesson authoring, and release cleanup.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/content" style={{ ...quickActionStyle, background: '#3730A3', color: 'white', padding: '10px 12px' }}>Open Content Library</Link>
                <Link href="/assignments" style={{ ...quickActionStyle, background: '#fff', color: '#3730A3', border: '1px solid #C7D2FE', padding: '10px 12px' }}>Cross-check assignments</Link>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Priority queue" eyebrow="Immediate intervention">
          {!workboardAvailable ? (
            sectionAlert('The progression workboard is unavailable right now, so this dashboard cannot safely pretend there is no intervention queue.', 'warning')
          ) : priorityQueue.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {priorityQueue.slice(0, 6).map((item) => {
                const tone = statusTone(item.progressionStatus);
                return (
                  <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 18, padding: '14px 16px', display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ color: '#0f172a' }}>{item.studentName}</strong>
                        <div style={{ color: '#64748b', marginTop: 4 }}>{item.cohortName ?? 'No cohort'} · {item.mallamName ?? 'No mallam'} · {item.podLabel ?? 'No pod'}</div>
                      </div>
                      <Pill label={item.progressionStatus} tone={tone.tone} text={tone.text} />
                    </div>
                    <div style={{ color: '#475569', lineHeight: 1.6 }}>{item.focus}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Pill label={`Attendance ${Math.round(item.attendanceRate * 100)}%`} tone="#F8FAFC" text="#334155" />
                      <Pill label={`Mastery ${Math.round(item.mastery * 100)}%`} tone="#EEF2FF" text="#3730A3" />
                      <Pill label={`${item.totalXp} pts`} tone="#FEF3C7" text="#92400E" />
                      <Pill label={`Level ${item.levelLabel}`} tone="#ECFDF5" text="#166534" />
                      <Pill label={`${item.badgesUnlocked} badge${item.badgesUnlocked === 1 ? '' : 's'}`} tone="#FDF2F8" text="#9D174D" />
                    </div>
                    <div style={{ color: '#3730A3', fontWeight: 700 }}>
                      Next module: {item.recommendedNextModuleTitle ?? 'No recommendation yet'}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <Link href={item.studentId ? `/progress?student=${encodeURIComponent(item.studentId)}&q=${encodeURIComponent(item.studentName)}` : `/progress?q=${encodeURIComponent(item.studentName)}`} style={{ ...quickActionStyle, background: '#F8FAFC', color: '#0F172A', border: '1px solid #CBD5E1', padding: '10px 12px' }}>
                        Open learner progress
                      </Link>
                      <Link href="/progress" style={{ ...quickActionStyle, background: '#111827', color: 'white', padding: '10px 12px' }}>
                        Open progress board
                      </Link>
                      <Link href="/assignments" style={{ ...quickActionStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', padding: '10px 12px' }}>
                        Cross-check assignments
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            sectionAlert('The live workboard is healthy, but no learner is currently flagged ready or watch. Nice problem to have.')
          )}
        </Card>

        <Card title="LMS route map" eyebrow="Admin shell">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800 }}>Admin routes</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {navigationItems.map((item) => (
                  <Pill
                    key={item.id}
                    label={item.label}
                    tone="#DCFCE7"
                    text="#166534"
                  />
                ))}
              </div>
              <div style={{ marginTop: 10, color: '#64748b', lineHeight: 1.6 }}>
                The LMS dashboard should expose the full admin shell operators actually use. This route map now reflects the live LMS surface instead of pretending reduced pilot scope is still the product reality.
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 18, background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#3730A3', fontWeight: 800 }}>Why coherent scope matters</div>
              <div style={{ marginTop: 10, color: '#3730A3', lineHeight: 1.6 }}>
                Deployment review gets dangerous when shared shell copy says one thing and visible navigation does another. Keep the route map, sidebar, and dashboard aligned so operators can trust the full LMS surface that is actually deployed.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/" style={{ ...quickActionStyle, background: '#111827', color: 'white' }}>Open dashboard</Link>
              <Link href="/content" style={{ ...quickActionStyle, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' }}>Open content</Link>
              <Link href="/assignments" style={{ ...quickActionStyle, background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' }}>Open assignments</Link>
              <Link href="/progress" style={{ ...quickActionStyle, background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>Open progress</Link>
              <Link href="/settings" style={{ ...quickActionStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>Open settings</Link>
            </div>
          </div>
        </Card>
      </section>

      <section style={{ ...responsiveGrid(340), marginBottom: 20 }}>
        <Card title="Executive signals" eyebrow="Narrative from the dashboard feed">
          {insightsResult.status !== 'fulfilled' ? (
            sectionAlert('Dashboard insights did not load, so use progress, assignments, and settings before making any “looks fine to me” call.', 'warning')
          ) : insights.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {insights.map((item, index) => (
                <div key={`${item.headline}-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: 18, padding: '14px 16px', display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#0f172a' }}>{item.headline}</strong>
                    <Pill label={item.priority} tone="#F5F3FF" text="#6D28D9" />
                  </div>
                  <div style={{ color: '#475569', lineHeight: 1.6 }}>{item.detail}</div>
                  <div style={{ color: '#3730A3', fontWeight: 800 }}>{item.metric}</div>
                </div>
              ))}
            </div>
          ) : (
            sectionAlert('The dashboard insights feed is live, but there are no narrative callouts right now. Cross-check progress or assignments if you want extra color, not because the page is lying.')
          )}
        </Card>

        <Card title="Assignments due soon" eyebrow="Next delivery pressure">
          <SimpleTable
            columns={['Lesson', 'Cohort', 'Owner', 'Due', 'Status']}
            rows={assignmentsAvailable
              ? dueSoonAssignments.length
                ? dueSoonAssignments.map((item) => {
                    const urgency = assignmentUrgency(item.dueDate, item.status);
                    return [
                      item.lessonTitle,
                      item.cohortName,
                      item.teacherName,
                      <div key={`${item.id}-due`} style={{ display: 'grid', gap: 6 }}>
                        <span>{formatDueLabel(item.dueDate)}</span>
                        <Pill label={urgency.label} tone={urgency.tone} text={urgency.text} />
                      </div>,
                      <Pill key={`${item.id}-status`} label={item.status.replace(/-/g, ' ')} tone={item.status === 'completed' ? '#E5E7EB' : item.status === 'active' ? '#DCFCE7' : '#E0E7FF'} text={item.status === 'completed' ? '#334155' : item.status === 'active' ? '#166534' : '#3730A3'} />,
                    ];
                  })
                : [[<span key="no-assignments" style={{ color: '#64748b' }}>The assignments feed is live, and there are no incomplete assignments to triage right now.</span>, '', '', '', '']]
              : [[<span key="assignments-unavailable" style={{ color: '#9a3412' }}>Assignment feed unavailable — do not treat this as a clear delivery board.</span>, '', '', '', '']]}
          />
        </Card>
      </section>
    </PageShell>
  );
}
