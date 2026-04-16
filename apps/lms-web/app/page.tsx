import Link from 'next/link';
import type { ReactNode } from 'react';
import { fetchAssignments, fetchAssessments, fetchCurriculumModules, fetchDashboardInsights, fetchDashboardSummary, fetchLessons, fetchMallams, fetchStudents, fetchSubjects, fetchWorkboard } from '../lib/api';
import { CreateAssessmentForm, UpdateModuleForm } from '../components/admin-forms';
import { DeploymentBlockerCard } from '../components/deployment-blocker-card';
import { InsightPanel } from '../components/insight-panel';
import { KpiStrip } from '../components/kpi-strip';
import { ModalLauncher } from '../components/modal-launcher';
import { assessmentMatchesModule } from '../lib/module-assessment-match';
import { API_BASE_SOURCE } from '../lib/config';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../lib/ui';
import type { Assignment, Assessment, CurriculumModule, DashboardInsight, DashboardSummary, Lesson, Mallam, Student, Subject, WorkboardItem } from '../lib/types';

const EMPTY_SUMMARY: DashboardSummary = {
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

const FALLBACK_INSIGHT: DashboardInsight = {
  priority: 'Data connection',
  headline: 'Live dashboard data is temporarily unavailable',
  detail: 'The LMS is still reachable, but one or more dashboard feeds did not load. Retry once the API is back and use the sections below if any data did arrive.',
  metric: 'API retry needed',
};

function assignmentEmptyRow(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b', lineHeight: 1.6 }}>{message}</span>, '', '', '', '']];
}

function workboardEmptyRow(message: string): ReactNode[][] {
  return [[<span key={message} style={{ color: '#64748b', lineHeight: 1.6 }}>{message}</span>, '', '', '', '', '', '']];
}

function sectionAlert(message: string, tone: 'warning' | 'neutral' = 'neutral') {
  const palette = tone === 'warning'
    ? { background: '#fff7ed', border: '#fed7aa', text: '#9a3412' }
    : { background: '#f8fafc', border: '#e2e8f0', text: '#64748b' };

  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: palette.background, border: `1px solid ${palette.border}`, color: palette.text, lineHeight: 1.6 }}>
      {message}
    </div>
  );
}

const quickActionStyle = {
  borderRadius: 14,
  padding: '12px 14px',
  fontWeight: 800,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const tableLinkStyle = {
  color: '#3730A3',
  fontWeight: 800,
  textDecoration: 'none',
} as const;

function describeReleaseRisk(blockerCount: number): { label: string; tone: string; text: string } {
  if (blockerCount >= 5) {
    return { label: 'Critical release blocker', tone: '#FEE2E2', text: '#991B1B' };
  }

  if (blockerCount >= 3) {
    return { label: 'High release risk', tone: '#FEF3C7', text: '#92400E' };
  }

  return { label: 'Moderate release risk', tone: '#E0E7FF', text: '#3730A3' };
}

function describeNextAction(module: {
  missingLessons: number;
  hasAssessmentGate: boolean;
  isDraftModule: boolean;
}) {
  const actions: string[] = [];

  if (module.isDraftModule) {
    actions.push('move the module out of draft');
  }

  if (module.missingLessons > 0) {
    actions.push(`create ${module.missingLessons} missing lesson${module.missingLessons === 1 ? '' : 's'}`);
  }

  if (!module.hasAssessmentGate) {
    actions.push('add the assessment gate');
  }

  if (!actions.length) {
    return 'This lane is structurally clear.';
  }

  return `${actions[0].charAt(0).toUpperCase()}${actions[0].slice(1)}${actions.length > 1 ? `, ${actions.slice(1, -1).join(', ')}${actions.length > 2 ? ',' : ''} and ${actions.at(-1)}` : ''} before publish.`;
}

function buildExactNameHref<T extends { id: string }>(items: T[], getName: (item: T) => string | null | undefined, targetName: string, fallbackHref: string, buildHref: (item: T) => string) {
  const normalizedTarget = targetName.trim().toLowerCase();
  if (!normalizedTarget) return fallbackHref;

  const matches = items.filter((item) => getName(item)?.trim().toLowerCase() === normalizedTarget);
  if (matches.length !== 1) return fallbackHref;

  return buildHref(matches[0]);
}

export default async function HomePage() {
  if (API_BASE_SOURCE === 'missing-production-env') {
    return (
      <DeploymentBlockerCard
        title="Dashboard"
        subtitle="Production wiring is incomplete, so the dashboard is refusing to cosplay as healthy."
        blockerHeadline="Deployment blocker: dashboard API base URL is missing."
        blockerDetail={(
          <>
            This production build does not have <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code>, so showing KPI zeros, fake-empty workboards, and bogus release confidence would be dishonest. Fix the env var, redeploy, then validate the dashboard with live data.
          </>
        )}
        whyBlocked={[
          'The dashboard is where operators decide whether the pilot is healthy. Quiet fallback zeros here would be worse than an obvious failure state.',
          'Until the API base exists, summary cards, assignments, learner workboard, and release blockers are all operationally untrustworthy.',
        ]}
        verificationItems={[
          {
            surface: 'Dashboard',
            expected: 'Live KPI totals and workboard rows load from the backend',
            failure: 'Zeros or empty cards with no backing API traffic',
          },
          {
            surface: 'Content blockers',
            expected: 'Real blocker counts reflect modules, lessons, and assessment gates',
            failure: 'Everything looks publishable with no real data',
          },
          {
            surface: 'Reports',
            expected: 'Operational and rewards views load from the live backend',
            failure: 'Pages degrade into fallback-only shell output',
          },
        ]}
        docs={[
          { label: 'LMS data map', href: '/LMS_DATA_MAP.html', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'UAT guide', href: '/LUMO_MVP_QA_UAT_GUIDE.html', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Content blocker', href: '/content', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
          { label: 'Reports blocker', href: '/reports', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const [summaryResult, assignmentsResult, insightsResult, workboardResult, studentsResult, mallamsResult, modulesResult, lessonsResult, assessmentsResult, subjectsResult] = await Promise.allSettled([
    fetchDashboardSummary(),
    fetchAssignments(),
    fetchDashboardInsights(),
    fetchWorkboard(),
    fetchStudents(),
    fetchMallams(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
    fetchSubjects(),
  ]);

  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : EMPTY_SUMMARY;
  const summaryFeedFailed = summaryResult.status === 'rejected';
  const assignmentsFeedFailed = assignmentsResult.status === 'rejected';
  const insightsFeedFailed = insightsResult.status === 'rejected';
  const workboardFeedFailed = workboardResult.status === 'rejected';
  const studentsFeedFailed = studentsResult.status === 'rejected';
  const mallamsFeedFailed = mallamsResult.status === 'rejected';

  const assignments: Assignment[] = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  const insights: DashboardInsight[] = insightsResult.status === 'fulfilled' ? insightsResult.value : [];
  const workboard: WorkboardItem[] = workboardResult.status === 'fulfilled' ? workboardResult.value : [];
  const students: Student[] = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const mallams: Mallam[] = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const modules: CurriculumModule[] = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons: Lesson[] = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const assessments: Assessment[] = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const subjects: Subject[] = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];

  const failedSources = [
    { label: 'summary', result: summaryResult },
    { label: 'assignments', result: assignmentsResult },
    { label: 'insights', result: insightsResult },
    { label: 'workboard', result: workboardResult },
    { label: 'students', result: studentsResult },
    { label: 'mallams', result: mallamsResult },
    { label: 'modules', result: modulesResult },
    { label: 'lessons', result: lessonsResult },
    { label: 'assessments', result: assessmentsResult },
    { label: 'subjects', result: subjectsResult },
  ].filter((entry) => entry.result.status === 'rejected').map((entry) => entry.label);

  const stats = summaryFeedFailed
    ? [
      { label: 'Active learners', value: 'Unavailable', tone: '#9CA3AF' },
      { label: 'Mallams', value: 'Unavailable', tone: '#9CA3AF' },
      { label: 'Active pods', value: 'Unavailable', tone: '#9CA3AF' },
      { label: 'Ready to progress', value: 'Unavailable', tone: '#9CA3AF' },
      { label: 'Assignments live', value: 'Unavailable', tone: '#9CA3AF' },
      { label: 'Assessments live', value: 'Unavailable', tone: '#9CA3AF' },
      { label: 'Lessons completed', value: 'Unavailable', tone: '#9CA3AF' },
      { label: 'Sync success', value: 'Unavailable', tone: '#9CA3AF' },
    ]
    : [
      { label: 'Active learners', value: String(summary.activeLearners) },
      { label: 'Mallams', value: String(summary.mallams), tone: '#0F766E' },
      { label: 'Active pods', value: String(summary.activePods), tone: '#2563EB' },
      { label: 'Ready to progress', value: String(summary.learnersReadyToProgress), tone: '#6C63FF' },
      { label: 'Assignments live', value: String(summary.activeAssignments) },
      { label: 'Assessments live', value: String(summary.assessmentsLive), tone: '#9333EA' },
      { label: 'Lessons completed', value: String(summary.lessonsCompleted) },
      { label: 'Sync success', value: `${Math.round(summary.syncSuccessRate * 100)}%`, tone: '#16A34A' },
    ];

  const topInsight = insights[0] ?? FALLBACK_INSIGHT;
  const atRiskLearners = students.filter((student) => student.attendanceRate < 0.85);
  const trainingMallams = mallams.filter((mallam) => mallam.status !== 'active');
  const moduleHasAssessmentGate = (module: (typeof modules)[number]) => assessments.some(
    (assessment) => assessmentMatchesModule(module, assessment),
  );

  const releaseBlockers = modules
    .map((module) => {
      const moduleLessons = lessons.filter((lesson) => lesson.moduleId === module.id || lesson.moduleTitle === module.title);
      const readyLessonCount = moduleLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
      const missingLessons = Math.max(module.lessonCount - readyLessonCount, 0);
      const hasAssessmentGate = moduleHasAssessmentGate(module);
      const blockerCount = missingLessons + (hasAssessmentGate ? 0 : 1);
      const isDraftModule = module.status === 'draft';
      const totalBlockers = blockerCount + (isDraftModule ? 1 : 0);

      if (!totalBlockers) {
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
        blockerCount: totalBlockers,
      };
    })
    .filter((module): module is NonNullable<typeof module> => Boolean(module))
    .sort((left, right) => right.blockerCount - left.blockerCount || right.missingLessons - left.missingLessons || left.title.localeCompare(right.title));

  const releaseFeedsFailed = modulesResult.status === 'rejected' || lessonsResult.status === 'rejected' || assessmentsResult.status === 'rejected';
  const publishReadyModules = modules.length - releaseBlockers.length;
  const highestPriorityBlocker = releaseBlockers[0] ?? null;
  const partialOutageMessage = failedSources.length
    ? `Dashboard degraded gracefully: ${failedSources.join(', ')} data ${failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.`
    : null;
  const liveFeedCount = 10 - failedSources.length;
  const trustLabel = failedSources.length ? 'Partial data — operator review required' : 'Live data verified';
  const trustTone = failedSources.length ? '#FEF3C7' : '#DCFCE7';
  const trustText = failedSources.length ? '#92400E' : '#166534';

  return (
    <PageShell
      title="Dashboard"
      subtitle="A sharper LMS/admin cockpit for learner readiness, mallam supervision, content operations, pod delivery health, and visibly real operational workflows."
      aside={(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/students" style={{ ...quickActionStyle, background: '#111827', color: 'white' }}>
            Open learners
          </Link>
          <Link href="/assignments" style={{ ...quickActionStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Manage assignments
          </Link>
          <Link href="/content" style={{ ...quickActionStyle, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' }}>
            Clear content blockers
          </Link>
          <a href="/LMS_DATA_MAP.html" target="_blank" rel="noreferrer" style={{ ...quickActionStyle, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            LMS data map
          </a>
          <a href="/LUMO_POSITIONING_BRIEF.html" target="_blank" rel="noreferrer" style={{ ...quickActionStyle, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
            Positioning brief
          </a>
        </div>
      )}
    >
      <div style={{ marginBottom: 16, padding: '18px 20px', borderRadius: 20, background: failedSources.length ? 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)' : 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)', border: `1px solid ${failedSources.length ? '#fed7aa' : '#bbf7d0'}`, boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)' }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8a94a6', fontWeight: 800 }}>Dashboard trust status</div>
              <strong style={{ fontSize: 22, color: '#0f172a' }}>{failedSources.length ? 'Do not treat this dashboard as fully authoritative yet.' : 'All dashboard feeds are live right now.'}</strong>
              <div style={{ color: '#475569', lineHeight: 1.7 }}>
                {partialOutageMessage ?? 'Summary, assignments, workboard, curriculum blockers, and supporting feeds all loaded. This is the version of the dashboard you can actually trust in a release review.'}
              </div>
            </div>
            <Pill label={trustLabel} tone={trustTone} text={trustText} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(226, 232, 240, 0.9)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#8a94a6', marginBottom: 6, fontWeight: 800 }}>Live feeds</div>
              <strong style={{ fontSize: 22, color: '#0f172a' }}>{liveFeedCount}/10</strong>
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>Feeds currently delivering usable dashboard data.</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(226, 232, 240, 0.9)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#8a94a6', marginBottom: 6, fontWeight: 800 }}>Release visibility</div>
              <strong style={{ fontSize: 22, color: '#0f172a' }}>{releaseFeedsFailed ? 'Partial' : 'Clear'}</strong>
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>{releaseFeedsFailed ? 'Curriculum blocker counts may be incomplete until modules, lessons, and assessments recover.' : 'Curriculum blocker lane is backed by live module, lesson, and assessment feeds.'}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(226, 232, 240, 0.9)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#8a94a6', marginBottom: 6, fontWeight: 800 }}>Immediate move</div>
              <strong style={{ fontSize: 18, color: '#0f172a' }}>{failedSources.length ? 'Fix missing feeds or operate carefully' : highestPriorityBlocker ? 'Clear the top release blocker' : 'Keep the lane clean'}</strong>
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>{failedSources.length ? `Missing: ${failedSources.join(', ')}.` : highestPriorityBlocker ? `${highestPriorityBlocker.title} is still the highest-value blocker to clear.` : 'No active dashboard blind spots or release blockers are shouting for attention.'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {failedSources.length ? <Link href="/reports" style={tableLinkStyle}>Cross-check reports</Link> : null}
            <Link href="/content?view=blocked" style={tableLinkStyle}>Review blocker board</Link>
            <a href="/LUMO_MVP_QA_UAT_GUIDE.html" target="_blank" rel="noreferrer" style={tableLinkStyle}>Run dashboard smoke check</a>
          </div>
        </div>
      </div>

      <KpiStrip items={stats} />

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <InsightPanel headline={topInsight.headline} detail={topInsight.detail} metric={topInsight.metric} />
        <Card title="Operations pulse" eyebrow="This week">
          <div style={{ display: 'grid', gap: 12 }}>
            {summaryFeedFailed ? sectionAlert('The summary feed failed, so operations totals are intentionally marked unavailable instead of pretending zero is real.', 'warning') : null}
            <MetricList
              items={summaryFeedFailed
                ? [
                  { label: 'Centers live', value: 'Unavailable' },
                  { label: 'Assignments running', value: 'Unavailable' },
                  { label: 'Assessment gates active', value: 'Unavailable' },
                  { label: 'Learners ready for progression', value: 'Unavailable' },
                ]
                : [
                  { label: 'Centers live', value: String(summary.centers) },
                  { label: 'Assignments running', value: String(summary.activeAssignments) },
                  { label: 'Assessment gates active', value: String(summary.assessmentsLive) },
                  { label: 'Learners ready for progression', value: String(summary.learnersReadyToProgress) },
                ]}
            />
          </div>
        </Card>
      </section>

      <section style={{ ...responsiveGrid(360), marginBottom: 20 }}>
        <Card title="Leadership cues" eyebrow="Priorities">
          <div style={{ display: 'grid', gap: 14 }}>
            {insightsFeedFailed ? sectionAlert('The insights feed failed, so leadership cues are temporarily stale. Summary cards still loaded; retry once the API recovers.', 'warning') : null}
            {insights.length ? insights.map((item) => (
              <div key={item.priority} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                  <strong>{item.priority}</strong>
                  <Pill label={item.metric} />
                </div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{item.headline}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{item.detail}</div>
              </div>
            )) : (
              sectionAlert(
                insightsFeedFailed
                  ? 'No insight cards are rendering because the insights feed is down.'
                  : 'No dashboard insights are available right now. The page stays up instead of faceplanting, which is frankly the more important feature during a demo.'
              )
            )}
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card title="Live assignments" eyebrow="Delivery">
            <div style={{ display: 'grid', gap: 12 }}>
              {assignmentsFeedFailed ? sectionAlert('The assignments feed failed. Delivery totals above may still be real, but the live assignment table could not refresh.', 'warning') : null}
              <SimpleTable
                columns={['Lesson', 'Cohort', 'Pod', 'Assessment', 'Due']}
                rows={assignments.length ? assignments.map((assignment) => [
                  <Link key={`${assignment.id}-lesson`} href="/assignments" style={tableLinkStyle}>
                    {assignment.lessonTitle}
                  </Link>,
                  assignment.cohortName,
                  assignment.podLabel ?? '—',
                  assignment.assessmentTitle ? <Link key={`${assignment.id}-assessment`} href="/assessments" style={tableLinkStyle}>{assignment.assessmentTitle}</Link> : '—',
                  assignment.dueDate,
                ]) : assignmentEmptyRow(assignmentsFeedFailed ? 'Assignments feed unavailable — retry once the API is back.' : 'No live assignments are queued right now.')}
              />
            </div>
          </Card>
          <Card title="Escalations to clear" eyebrow="Admin watchlist">
            <div style={{ display: 'grid', gap: 12 }}>
              {studentsFeedFailed || mallamsFeedFailed ? sectionAlert(`Escalation coverage is partial: ${[studentsFeedFailed ? 'students' : null, mallamsFeedFailed ? 'mallams' : null].filter(Boolean).join(' + ')} feed ${studentsFeedFailed && mallamsFeedFailed ? 'are' : 'is'} unavailable.`, 'warning') : null}
              {!atRiskLearners.length && !trainingMallams.length ? (
                sectionAlert(
                  studentsFeedFailed || mallamsFeedFailed
                    ? 'No escalation cards can be trusted until the missing feed recovers.'
                    : 'No active escalations right now. Attendance and mallam status both look clear.'
                )
              ) : null}
              {atRiskLearners.map((student) => (
                <div key={student.id} style={{ padding: 14, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa' }}>
                  <strong>{student.name}</strong> is at {Math.round(student.attendanceRate * 100)}% attendance in {student.cohortName ?? 'an unassigned cohort'}.
                </div>
              ))}
              {trainingMallams.map((mallam) => (
                <div key={mallam.id} style={{ padding: 14, borderRadius: 16, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                  <strong>{mallam.displayName}</strong> is still {mallam.status}; deployment plan should be confirmed before adding more learners.
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section style={{ ...responsiveGrid(320), marginTop: 20 }}>
        <Card title="Learner workboard" eyebrow="Readiness queue">
          <div style={{ display: 'grid', gap: 12 }}>
            {workboardFeedFailed ? sectionAlert('The workboard feed failed, so learner progression rows below are not current.', 'warning') : null}
            <SimpleTable
              columns={['Learner', 'Mallam', 'Cohort', 'Attendance', 'Mastery', 'Status', 'Next move']}
              rows={workboard.length ? workboard.map((item) => {
                const studentHref = buildExactNameHref(
                  students,
                  (student) => student.name,
                  item.studentName,
                  '/students',
                  (student) => `/students/${student.id}`,
                );
                const mallamHref = item.mallamName
                  ? buildExactNameHref(
                    mallams,
                    (mallam) => mallam.displayName ?? mallam.name,
                    item.mallamName,
                    '/mallams',
                    (mallam) => `/mallams/${mallam.id}`,
                  )
                  : null;

                return [
                  <Link key={`${item.id}-student`} href={studentHref} style={tableLinkStyle}>
                    {item.studentName}
                  </Link>,
                  item.mallamName ? <Link key={`${item.id}-mallam`} href={mallamHref ?? '/mallams'} style={tableLinkStyle}>{item.mallamName}</Link> : '—',
                  item.cohortName ?? '—',
                  `${Math.round(item.attendanceRate * 100)}%`,
                  `${Math.round(item.mastery * 100)}% in ${item.focus}`,
                  <Pill key={`${item.id}-status`} label={item.progressionStatus} tone={item.progressionStatus === 'ready' ? '#DCFCE7' : item.progressionStatus === 'watch' ? '#FEF3C7' : '#E0E7FF'} text={item.progressionStatus === 'ready' ? '#166534' : item.progressionStatus === 'watch' ? '#92400E' : '#3730A3'} />,
                  item.recommendedNextModuleTitle ? <Link key={`${item.id}-next-module`} href="/progress" style={tableLinkStyle}>{item.recommendedNextModuleTitle}</Link> : '—',
                ];
              }) : workboardEmptyRow(workboardFeedFailed ? 'Workboard feed unavailable — retry once learner progression data is back.' : 'No learners are queued in the readiness workboard right now.')}
            />
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card title="Content release blockers" eyebrow="Deployment readiness">
            <div style={{ display: 'grid', gap: 12 }}>
              <MetricList
                items={[
                  { label: 'Modules publish-ready', value: String(Math.max(publishReadyModules, 0)) },
                  { label: 'Modules blocked', value: String(releaseBlockers.length) },
                  { label: 'Draft modules blocking release', value: String(releaseBlockers.filter((module) => module.isDraftModule).length) },
                  { label: 'Missing lesson gaps', value: String(releaseBlockers.reduce((sum, module) => sum + module.missingLessons, 0)) },
                  { label: 'Missing assessment gates', value: String(releaseBlockers.filter((module) => !module.hasAssessmentGate).length) },
                ]}
              />
              {releaseFeedsFailed ? sectionAlert('Release readiness is partially blind because one or more curriculum feeds failed. The dashboard stays up, but do not trust blocker counts until modules, lessons, and assessments all load.', 'warning') : null}
              {!releaseBlockers.length ? sectionAlert(releaseFeedsFailed ? 'No blocker rows can be trusted until the missing curriculum feeds recover.' : 'No content blockers right now. The LMS finally has permission to stop being dramatic about release readiness.') : null}
            </div>
          </Card>

          <Card title="Top blockers to clear" eyebrow="Admin watchlist">
            <div style={{ display: 'grid', gap: 12 }}>
              {releaseFeedsFailed ? sectionAlert('Blocker rows below may be incomplete because a curriculum feed is missing.', 'warning') : null}
              {highestPriorityBlocker ? (() => {
                const blockerBoardHref = `/content?view=blocked${highestPriorityBlocker.subjectId ? `&subject=${encodeURIComponent(highestPriorityBlocker.subjectId)}` : ''}&q=${encodeURIComponent(highestPriorityBlocker.title)}`;
                const createLessonHref = `/content/lessons/new?subjectId=${encodeURIComponent(highestPriorityBlocker.subjectId ?? '')}&moduleId=${encodeURIComponent(highestPriorityBlocker.id)}&from=${encodeURIComponent(blockerBoardHref)}&focus=blockers`;
                const risk = describeReleaseRisk(highestPriorityBlocker.blockerCount);
                const moduleDraftStatusButton = highestPriorityBlocker.isDraftModule ? (
                  <ModalLauncher
                    buttonLabel="Move module out of draft"
                    title={`Update module status · ${highestPriorityBlocker.title}`}
                    description="Clear the draft-only release blocker without bouncing out of the dashboard."
                    eyebrow="Update module"
                    triggerStyle={{
                      border: 0,
                      padding: 0,
                      background: 'transparent',
                      color: '#3730A3',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <UpdateModuleForm
                      modules={[{
                        id: highestPriorityBlocker.id,
                        title: highestPriorityBlocker.title,
                        subjectId: highestPriorityBlocker.subjectId,
                        subjectName: highestPriorityBlocker.subjectName,
                        strandName: '',
                        level: '',
                        lessonCount: Math.max(highestPriorityBlocker.missingLessons, 1),
                        status: 'draft',
                      } satisfies CurriculumModule]}
                      returnPath="/"
                    />
                  </ModalLauncher>
                ) : null;

                return (
                  <div style={{ padding: 16, borderRadius: 18, background: '#FEFCE8', border: '1px solid #FDE68A', display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <strong style={{ color: '#713F12' }}>Clear this module first: {highestPriorityBlocker.title}</strong>
                        <span style={{ color: '#854D0E', lineHeight: 1.6 }}>{describeNextAction(highestPriorityBlocker)}</span>
                      </div>
                      <Pill label={risk.label} tone={risk.tone} text={risk.text} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link href={blockerBoardHref} style={tableLinkStyle}>Open blocker board</Link>
                      {highestPriorityBlocker.missingLessons > 0 ? <Link href={createLessonHref} style={tableLinkStyle}>Create next missing lesson</Link> : null}
                      {moduleDraftStatusButton}
                    </div>
                  </div>
                );
              })() : null}
              <SimpleTable
                columns={['Module', 'Subject', 'Gaps', 'Next action', 'Release risk']}
                rows={releaseBlockers.length ? releaseBlockers.slice(0, 5).map((module) => {
                  const blockerBoardHref = `/content?view=blocked${module.subjectId ? `&subject=${encodeURIComponent(module.subjectId)}` : ''}&q=${encodeURIComponent(module.title)}`;
                  const createLessonHref = `/content/lessons/new?subjectId=${encodeURIComponent(module.subjectId ?? '')}&moduleId=${encodeURIComponent(module.id)}&from=${encodeURIComponent(blockerBoardHref)}&focus=blockers`;
                  const scopedSubjects = module.subjectId ? subjects.filter((subject) => subject.id === module.subjectId) : subjects;
                  const assessmentSubjects = scopedSubjects.length ? scopedSubjects : subjects;
                  const risk = describeReleaseRisk(module.blockerCount);
                  const moduleDraftStatusButton = module.isDraftModule ? (
                    <ModalLauncher
                      buttonLabel="Move module out of draft"
                      title={`Update module status · ${module.title}`}
                      description="Clear the draft-only release blocker directly from the dashboard row."
                      eyebrow="Update module"
                      triggerStyle={{
                        border: 0,
                        padding: 0,
                        background: 'transparent',
                        color: '#3730A3',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      <UpdateModuleForm
                        modules={[{
                          id: module.id,
                          title: module.title,
                          subjectId: module.subjectId,
                          subjectName: module.subjectName,
                          strandName: '',
                          level: '',
                          lessonCount: Math.max(module.missingLessons, 1),
                          status: 'draft',
                        } satisfies CurriculumModule]}
                        returnPath="/"
                      />
                    </ModalLauncher>
                  ) : null;


                  return [
                    <div key={`${module.id}-module`} style={{ display: 'grid', gap: 6 }}>
                      <Link href={blockerBoardHref} style={tableLinkStyle}>
                        {module.title}
                      </Link>
                      <span style={{ color: '#64748b', fontSize: 13 }}>{module.blockerCount} release blocker{module.blockerCount === 1 ? '' : 's'}</span>
                    </div>,
                    module.subjectName,
                    <div key={`${module.id}-gaps`} style={{ display: 'grid', gap: 6 }}>
                      <span>{module.missingLessons > 0 ? `${module.missingLessons} lesson gap${module.missingLessons === 1 ? '' : 's'}` : 'Lessons complete'}</span>
                      <span style={{ color: module.isDraftModule ? '#B45309' : '#64748b', fontSize: 13, fontWeight: module.isDraftModule ? 800 : 600 }}>
                        {module.isDraftModule ? 'Module is still draft' : 'Module status is release-safe'}
                      </span>
                      {module.missingLessons > 0 ? <Link href={createLessonHref} style={tableLinkStyle}>Create missing lesson</Link> : null}
                    </div>,
                    <div key={`${module.id}-next-action`} style={{ display: 'grid', gap: 6 }}>
                      <span>{describeNextAction(module)}</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link href={blockerBoardHref} style={tableLinkStyle}>Open blockers board</Link>
                        {moduleDraftStatusButton}
                        {!module.hasAssessmentGate ? (
                          subjectsResult.status === 'fulfilled' && assessmentSubjects.length ? (
                            <ModalLauncher
                              buttonLabel="Add assessment gate"
                              title={`Create assessment gate · ${module.title}`}
                              description="Create the missing progression gate directly from the dashboard blocker row instead of bouncing back to the content board."
                              eyebrow="Create assessment"
                              triggerStyle={{
                                border: 0,
                                padding: 0,
                                background: 'transparent',
                                color: '#3730A3',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              <CreateAssessmentForm
                                modules={[{
                                  id: module.id,
                                  title: module.title,
                                  subjectId: module.subjectId,
                                  subjectName: module.subjectName,
                                  strandName: '',
                                  level: '',
                                  lessonCount: Math.max(module.missingLessons, 0),
                                  status: 'draft',
                                } satisfies CurriculumModule]}
                                subjects={assessmentSubjects}
                                returnPath="/"
                              />
                            </ModalLauncher>
                          ) : (
                            <Link href={blockerBoardHref} style={tableLinkStyle}>Add assessment gate</Link>
                          )
                        ) : null}
                      </div>
                    </div>,
                    <Pill key={`${module.id}-risk`} label={risk.label} tone={risk.tone} text={risk.text} />,
                  ];
                }) : [[<span key="release-clear" style={{ color: '#64748b', lineHeight: 1.6 }}>{releaseFeedsFailed ? 'Curriculum feeds unavailable — retry once content data is back.' : 'No blocker rows to clear. Content release lane is clean.'}</span>, '', '', '', '']]}
              />
            </div>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
