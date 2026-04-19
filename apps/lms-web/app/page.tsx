import Link from 'next/link';
import { DeploymentBlockerCard } from '../components/deployment-blocker-card';
import { fetchAssignments, fetchAssessments, fetchCurriculumModules, fetchDashboardInsights, fetchDashboardSummary, fetchLessons, fetchMallams, fetchWorkboard } from '../lib/api';
import { API_BASE_DIAGNOSTIC, API_BASE_SOURCE } from '../lib/config';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../lib/ui';
import type { Assignment, Assessment, CurriculumModule, DashboardInsight, DashboardSummary, Lesson, Mallam, WorkboardItem } from '../lib/types';

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
  return `${Math.round(value * 100)}%`;
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
}) {
  const actions: string[] = [];

  if (module.isDraftModule) actions.push('move the module out of draft');
  if (module.missingLessons > 0) actions.push(`create ${module.missingLessons} missing lesson${module.missingLessons === 1 ? '' : 's'}`);
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
  if (API_BASE_SOURCE === 'default-production-fallback') {
    return {
      label: 'Default production API',
      note: `Dashboard is using the fallback production host ${API_BASE_DIAGNOSTIC.expectedFormat} because NEXT_PUBLIC_API_BASE_URL is unset. Good enough for this pilot deploy, but still worth verifying deliberately.`,
      tone: { background: '#DBEAFE', border: '1px solid #93C5FD', text: '#1D4ED8' },
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

export default async function HomePage() {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Dashboard"
        subtitle="The admin landing page is intentionally blocked until the production LMS is wired to a real, production-safe API."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: dashboard API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is present, but the current value is not production-safe. {API_BASE_DIAGNOSTIC.blockerDetail} Treating that as healthy would let a broken deployment masquerade as a live admin dashboard.
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
        docs={[
          { label: 'Learners blocker', href: '/students', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Reports blocker', href: '/reports', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
          { label: 'Settings blocker', href: '/settings', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
        ]}
      />
    );
  }

  const [summaryResult, insightsResult, workboardResult, mallamsResult, assignmentsResult, modulesResult, lessonsResult, assessmentsResult] = await Promise.allSettled([
    fetchDashboardSummary(),
    fetchDashboardInsights(),
    fetchWorkboard(),
    fetchMallams(),
    fetchAssignments(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
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

  const failedSources = [
    { label: 'dashboard summary', result: summaryResult },
    { label: 'insights', result: insightsResult },
    { label: 'workboard', result: workboardResult },
    { label: 'mallams', result: mallamsResult },
    { label: 'assignments', result: assignmentsResult },
    { label: 'modules', result: modulesResult },
    { label: 'lessons', result: lessonsResult },
    { label: 'assessments', result: assessmentsResult },
  ].filter((entry) => entry.result.status === 'rejected').map((entry) => entry.label);
  const criticalDashboardFailures = [
    !summaryAvailable ? 'dashboard summary' : null,
    !workboardAvailable ? 'workboard' : null,
    !mallamsAvailable ? 'mallams' : null,
    !assignmentsAvailable ? 'assignments' : null,
  ].filter(Boolean) as string[];

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
  const assessmentLinkedModuleIds = new Set(assessments.map((assessment) => assessment.moduleId).filter(Boolean));
  const releaseBlockers = modules
    .map((module) => {
      const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id || lesson.moduleTitle === module.title);
      const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
      const missingLessons = Math.max(module.lessonCount - readyLessonCount, 0);
      const hasAssessmentGate = assessmentLinkedModuleIds.has(module.id);
      const isDraftModule = module.status === 'draft';
      const blockerCount = missingLessons + (hasAssessmentGate ? 0 : 1) + (isDraftModule ? 1 : 0);

      if (!blockerCount) {
        return null;
      }

      return {
        id: module.id,
        title: module.title,
        subjectId: module.subjectId ?? '',
        subjectName: module.subjectName ?? '—',
        missingLessons,
        hasAssessmentGate,
        isDraftModule,
        blockerCount,
      };
    })
    .filter((module): module is NonNullable<typeof module> => Boolean(module))
    .sort((left, right) => right.blockerCount - left.blockerCount || right.missingLessons - left.missingLessons || left.title.localeCompare(right.title));
  const releaseFeedsAvailable = modulesResult.status === 'fulfilled' && lessonsResult.status === 'fulfilled' && assessmentsResult.status === 'fulfilled';
  const draftModuleBlockers = releaseBlockers.filter((module) => module.isDraftModule);
  const missingGateBlockers = releaseBlockers.filter((module) => !module.hasAssessmentGate);
  const liveMissingGateBlockers = missingGateBlockers.filter((module) => !module.isDraftModule);
  const publishReadyModules = Math.max(modules.length - releaseBlockers.length, 0);
  const topReleaseBlocker = releaseBlockers[0] ?? null;

  if (hasCriticalDashboardGap) {
    const blockerDetail = !summaryAvailable && !workboardAvailable && !mallamsAvailable && !assignmentsAvailable
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
                : 'The assignment pressure feed failed to load from the live API. Without the live delivery queue, this dashboard cannot honestly represent workload or due-soon risk.';

    return (
      <DeploymentBlockerCard
        title="Dashboard"
        subtitle="The admin landing page stays blocked when the critical live dashboard feeds are down."
        blockerHeadline="Deployment blocker: dashboard live feeds are degraded."
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length
              ? `Failed feed${failedSources.length === 1 ? '' : 's'}: ${failedSources.join(', ')}.`
              : 'The dashboard refused to guess.'}
          </>
        )}
        whyBlocked={[
          'The root route is the deployment reviewer’s first trust check. If summary, progression, mallam coverage, or assignment pressure is missing, the page should not cosplay as a healthy command center.',
          'Operators use this screen to decide who needs intervention now, whether facilitators are actually covered, and whether delivery load is under control. Missing any of those turns this into vibes-based operations.',
          'A loud blocker is safer than polished blanks, fake zeros, or “looks mostly fine” cards during an outage.',
        ]}
        verificationItems={[
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
        ]}
        fixItems={[
          { label: 'Failing feeds', value: criticalDashboardFailures.length ? criticalDashboardFailures.join(', ') : 'dashboard summary, workboard, mallams, assignments' },
          { label: 'Operator action', value: 'Restore the critical live feeds before using this route as a release signal' },
          { label: 'Cross-check', value: 'Verify /progress, /students, /mallams, and /assignments after the upstream fix lands' },
        ]}
        docs={[
          { label: 'Check progress feed', href: '/progress', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Cross-check learners', href: '/students', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Verify reports', href: '/reports', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
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
          <Link href="/students" style={{ ...quickActionStyle, background: '#111827', color: 'white' }}>
            Open learners
          </Link>
          <Link href="/content" style={{ ...quickActionStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Open content
          </Link>
          <Link href="/reports" style={{ ...quickActionStyle, background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
            Open reports
          </Link>
          <Link href="/canvas" style={{ ...quickActionStyle, background: '#ECFEFF', color: '#155E75', border: '1px solid #A5F3FC' }}>
            Open canvas
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
        </div>
      </section>

      {hasCriticalDashboardGap ? (
        <section style={{ marginBottom: 20 }}>
          <div style={{ padding: '18px 20px', borderRadius: 20, background: '#fff7ed', border: '1px solid #fed7aa', display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <strong style={{ fontSize: 20, color: '#9a3412' }}>Stop treating this dashboard as a release signal.</strong>
              <div style={{ color: '#9a3412', lineHeight: 1.7 }}>
                {!summaryAvailable && !workboardAvailable && !mallamsAvailable && !assignmentsAvailable
                  ? 'Summary, progression, facilitator coverage, and assignment pressure are all down, so this route is intentionally calling the outage out instead of faking calm zeros.'
                  : !summaryAvailable && !workboardAvailable
                    ? 'Both the summary and progression queue are unavailable, so this route is intentionally calling the outage out instead of faking calm zeros.'
                    : !summaryAvailable
                      ? 'The summary feed is missing, so the top-line deployment counts are unavailable and sign-off would be fiction.'
                      : !workboardAvailable
                        ? 'The progression queue is missing, so the dashboard cannot honestly show who is blocked, ready, or quietly slipping.'
                        : !mallamsAvailable && !assignmentsAvailable
                          ? 'Both facilitator coverage and assignment pressure are missing, so the dashboard cannot honestly represent staffing or delivery load.'
                          : !mallamsAvailable
                            ? 'Facilitator coverage is missing, so the dashboard cannot honestly represent who is available to support delivery.'
                            : 'Assignment pressure is missing, so the dashboard cannot honestly represent delivery load or due-soon risk.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/progress" style={{ ...quickActionStyle, background: '#9a3412', color: 'white' }}>Check progress feed</Link>
              <Link href="/students" style={{ ...quickActionStyle, background: '#fff', color: '#9a3412', border: '1px solid #fdba74' }}>Cross-check learner roster</Link>
              <Link href="/reports" style={{ ...quickActionStyle, background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' }}>Verify reports before sign-off</Link>
            </div>
          </div>
        </section>
      ) : null}

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
        <Card title="Content release blockers" eyebrow="Deployment readiness">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ padding: '14px 16px', borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800 }}>Blocked modules</div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{releaseFeedsAvailable ? releaseBlockers.length : '—'}</div>
                <div style={{ marginTop: 6, color: '#64748b', lineHeight: 1.6 }}>
                  {releaseFeedsAvailable
                    ? releaseBlockers.length
                      ? `${draftModuleBlockers.length} draft module${draftModuleBlockers.length === 1 ? '' : 's'} are still blocking release alongside lesson and assessment gaps.`
                      : 'No release blockers are visible in the live curriculum feeds. Miracles happen.'
                    : 'Curriculum release feeds are unavailable, so blocker counts are intentionally withheld instead of guessed.'}
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
            </div>
            {!releaseFeedsAvailable ? sectionAlert('Modules, lessons, or assessments failed to load. The dashboard refuses to fake content-readiness counts while those feeds are blind.', 'warning') : null}
            {releaseFeedsAvailable && missingGateBlockers.length ? (
              <div style={{ padding: '16px 18px', borderRadius: 18, background: '#FEF2F2', border: '1px solid #FECACA', display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <strong style={{ color: '#991B1B' }}>Assessment gate warning</strong>
                    <span style={{ color: '#991B1B', lineHeight: 1.6 }}>{describeGateWarning(missingGateBlockers.length, liveMissingGateBlockers.length)}</span>
                  </div>
                  <Pill
                    label={liveMissingGateBlockers.length ? 'Assignment freeze recommended' : 'Gate backlog'}
                    tone={liveMissingGateBlockers.length ? '#FEE2E2' : '#FEF3C7'}
                    text={liveMissingGateBlockers.length ? '#991B1B' : '#92400E'}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href="/content?view=blocked" style={{ ...quickActionStyle, background: '#991B1B', color: 'white', padding: '10px 12px' }}>Review gate blockers</Link>
                  <Link href="/assignments" style={{ ...quickActionStyle, background: '#fff', color: '#991B1B', border: '1px solid #FECACA', padding: '10px 12px' }}>Cross-check assignment board</Link>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {missingGateBlockers.slice(0, 3).map((module) => {
                    const blockerBoardHref = `/content?view=blocked${module.subjectId ? `&subject=${module.subjectId}` : ''}&q=${encodeURIComponent(module.title)}`;
                    return (
                      <div key={`${module.id}-gate-warning`} style={{ padding: '12px 14px', borderRadius: 14, background: '#fff', border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong style={{ color: '#7F1D1D' }}>{module.title}</strong>
                          <span style={{ color: '#991B1B', lineHeight: 1.5 }}>{module.isDraftModule ? 'Still draft and missing its gate.' : 'Looks assignable at a glance, but the progression gate is still missing.'}</span>
                        </div>
                        <Link href={blockerBoardHref} style={{ color: '#991B1B', fontWeight: 800, textDecoration: 'none' }}>Open blocker board</Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {topReleaseBlocker ? (() => {
              const blockerBoardHref = `/content?view=blocked${topReleaseBlocker.subjectId ? `&subject=${topReleaseBlocker.subjectId}` : ''}&q=${encodeURIComponent(topReleaseBlocker.title)}`;
              const createLessonHref = `/content/lessons/new?subjectId=${topReleaseBlocker.subjectId}&moduleId=${topReleaseBlocker.id}&from=${encodeURIComponent(blockerBoardHref)}&focus=blockers`;
              const risk = describeReleaseRisk(topReleaseBlocker.blockerCount);

              return (
                <div style={{ padding: '16px 18px', borderRadius: 18, background: '#FEFCE8', border: '1px solid #FDE68A', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <strong style={{ color: '#713F12' }}>Top blocker: {topReleaseBlocker.title}</strong>
                      <span style={{ color: '#854D0E', lineHeight: 1.6 }}>{describeNextAction(topReleaseBlocker)}</span>
                    </div>
                    <Pill label={risk.label} tone={risk.tone} text={risk.text} />
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link href={blockerBoardHref} style={{ ...quickActionStyle, background: '#92400E', color: 'white', padding: '10px 12px' }}>Open blockers board</Link>
                    {topReleaseBlocker.missingLessons > 0 ? <Link href={createLessonHref} style={{ ...quickActionStyle, background: '#fff', color: '#92400E', border: '1px solid #FDE68A', padding: '10px 12px' }}>Create missing lesson</Link> : null}
                  </div>
                </div>
              );
            })() : releaseFeedsAvailable ? sectionAlert('No release blockers are visible from the live curriculum feeds. For once, the dashboard is allowed to be calm.') : null}
            {releaseBlockers.length ? (
              <SimpleTable
                columns={['Module', 'Subject', 'Gaps', 'Next action', 'Risk']}
                rows={releaseBlockers.slice(0, 5).map((module) => {
                  const blockerBoardHref = `/content?view=blocked${module.subjectId ? `&subject=${module.subjectId}` : ''}&q=${encodeURIComponent(module.title)}`;
                  const createLessonHref = `/content/lessons/new?subjectId=${module.subjectId}&moduleId=${module.id}&from=${encodeURIComponent(blockerBoardHref)}&focus=blockers`;
                  const risk = describeReleaseRisk(module.blockerCount);

                  return [
                    <Link key={`${module.id}-module`} href={blockerBoardHref} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>{module.title}</Link>,
                    module.subjectName,
                    <div key={`${module.id}-gaps`} style={{ display: 'grid', gap: 6 }}>
                      <span>{module.missingLessons > 0 ? `${module.missingLessons} lesson gap${module.missingLessons === 1 ? '' : 's'}` : 'Lessons complete'}</span>
                      <span style={{ color: module.isDraftModule ? '#B45309' : '#64748b', fontSize: 13, fontWeight: module.isDraftModule ? 800 : 600 }}>
                        {module.isDraftModule ? 'Module is still draft' : 'Module status is release-safe'}
                      </span>
                    </div>,
                    <div key={`${module.id}-next`} style={{ display: 'grid', gap: 6 }}>
                      <span>{describeNextAction(module)}</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link href={blockerBoardHref} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>Open blocker board</Link>
                        {module.missingLessons > 0 ? <Link href={createLessonHref} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>Create lesson</Link> : null}
                      </div>
                    </div>,
                    <Pill key={`${module.id}-risk`} label={risk.label} tone={risk.tone} text={risk.text} />,
                  ];
                })}
              />
            ) : null}
          </div>
        </Card>

        <Card title="Priority queue" eyebrow="Immediate intervention">
          {!workboardAvailable ? (
            sectionAlert('The progression workboard is unavailable right now, so this dashboard cannot safely pretend there is no intervention queue.', 'warning')
          ) : priorityQueue.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {priorityQueue.slice(0, 6).map((item) => {
                const tone = statusTone(item.progressionStatus);
                const learnerHref = item.studentId ? `/students/${item.studentId}` : null;
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
                      <Pill label={`Level ${item.levelLabel}`} tone="#ECFDF5" text="#166534" />
                      <Pill label={`${item.badgesUnlocked} badge${item.badgesUnlocked === 1 ? '' : 's'}`} tone="#FDF2F8" text="#9D174D" />
                    </div>
                    <div style={{ color: '#3730A3', fontWeight: 700 }}>
                      Next module: {item.recommendedNextModuleTitle ?? 'No recommendation yet'}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {learnerHref ? (
                        <Link href={learnerHref} style={{ ...quickActionStyle, background: '#111827', color: 'white', padding: '10px 12px' }}>
                          Open learner
                        </Link>
                      ) : (
                        <span style={{ ...quickActionStyle, background: '#E5E7EB', color: '#64748B', padding: '10px 12px', cursor: 'not-allowed' }}>
                          Learner link unavailable
                        </span>
                      )}
                      <Link href="/progress" style={{ ...quickActionStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', padding: '10px 12px' }}>
                        Open progress board
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

        <Card title="Operational readout" eyebrow="Coverage + flow">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ padding: '14px 16px', borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800 }}>Mallam coverage</div>
              <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{mallamsAvailable ? activeMallams.length : '—'}</div>
              <div style={{ marginTop: 6, color: '#64748b', lineHeight: 1.6 }}>
                {mallamsAvailable
                  ? `${activeMallams.length} of ${mallams.length} facilitators are active in the live roster.`
                  : 'Mallam feed is unavailable right now, so facilitator coverage needs a route-level cross-check.'}
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 18, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800 }}>Assignment pressure</div>
              <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{assignmentsAvailable ? dueSoonAssignments.length : '—'}</div>
              <div style={{ marginTop: 6, color: '#64748b', lineHeight: 1.6 }}>
                {assignmentsAvailable
                  ? dueSoonAssignments.length
                    ? 'Incomplete assignments sorted by nearest due date so operators can triage delivery first.'
                    : 'No incomplete assignments are visible from the live feed.'
                  : 'Assignment feed is unavailable, so delivery pressure cannot be cleared from this card.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/progress" style={{ ...quickActionStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>Open progress</Link>
              <Link href="/assignments" style={{ ...quickActionStyle, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' }}>Open assignments</Link>
              <Link href="/mallams" style={{ ...quickActionStyle, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>Open mallams</Link>
            </div>
          </div>
        </Card>
      </section>

      <section style={{ ...responsiveGrid(340), marginBottom: 20 }}>
        <Card title="Executive signals" eyebrow="Narrative from the dashboard feed">
          {insightsResult.status !== 'fulfilled' ? (
            sectionAlert('Dashboard insights did not load, so use reports and progress before making any “looks fine to me” call.', 'warning')
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
            sectionAlert('The dashboard insights feed is live, but there are no narrative callouts right now. Cross-check reports if you want extra color, not because the page is lying.')
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
