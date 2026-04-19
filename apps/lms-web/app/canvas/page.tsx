import Link from 'next/link';
import { CurriculumCanvas } from '../../components/curriculum-canvas';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { fetchAssessments, fetchCurriculumCanvasTree, fetchCurriculumModules, fetchLessons, fetchStrands, fetchSubjects } from '../../lib/api';
import { buildCurriculumCanvasData, buildCurriculumCanvasDataFromTree } from '../../lib/curriculum-canvas';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { PageShell, Pill } from '../../lib/ui';
import {
  bulkUpdateCanvasModuleLessonsAction,
  createCanvasAssessmentQuickAction,
  createCanvasModuleLessonShellsAction,
  quickUpdateAssessmentStatusAction,
  quickLinkCanvasLessonAssessmentAction,
  quickUpdateCanvasAssessmentAction,
  quickUpdateCanvasLessonAction,
  quickUpdateCanvasModuleAction,
  quickUpdateLessonStatusAction,
} from '../actions';

function buildHardRescueCanvasData(reason: string) {
  return {
    subjects: [
      {
        id: 'rescue-ops',
        name: 'Canvas Rescue Lane',
        icon: 'construction',
        strands: [
          {
            id: 'rescue-actions',
            name: 'Operator actions',
            modules: [
              {
                id: 'rescue-config',
                title: 'Restore API wiring',
                status: 'review',
                level: 'production blocker',
                lessonCount: 2,
                readyLessons: 1,
                gapCount: 1,
                provenance: 'rescue' as const,
                coverageLabel: '2/2 rescue steps mapped',
                assessmentCoverageLabel: '1 recovery checkpoint attached',
                blockerSummary: reason,
                lessons: [
                  {
                    id: 'rescue-config-check',
                    title: 'Check the deployed API base URL',
                    status: API_BASE_DIAGNOSTIC.deploymentBlocked ? 'review' : 'approved',
                    durationMinutes: 5,
                    mode: 'ops',
                    assessmentTitle: 'Production config checkpoint',
                    assessmentId: 'rescue-assessment-config',
                    objectiveCount: 2,
                    activityCount: 2,
                  },
                  {
                    id: 'rescue-config-redeploy',
                    title: 'Redeploy and confirm /canvas is visibly populated',
                    status: 'draft',
                    durationMinutes: 8,
                    mode: 'ops',
                    assessmentTitle: 'Production config checkpoint',
                    assessmentId: 'rescue-assessment-config',
                    objectiveCount: 2,
                    activityCount: 3,
                  },
                ],
                assessments: [
                  {
                    id: 'rescue-assessment-config',
                    subjectId: 'rescue-ops',
                    moduleId: 'rescue-config',
                    title: 'Production config checkpoint',
                    kind: 'manual',
                    trigger: 'module-complete',
                    triggerLabel: 'After env + redeploy verification',
                    progressionGate: 'restore-canvas',
                    passingScore: 1,
                    subjectName: 'Canvas Rescue Lane',
                    moduleTitle: 'Restore API wiring',
                    status: 'review',
                  },
                ],
              },
              {
                id: 'rescue-content',
                title: 'Use the real content boards now',
                status: 'active',
                level: 'fallback workflow',
                lessonCount: 3,
                readyLessons: 3,
                gapCount: 0,
                provenance: 'rescue' as const,
                coverageLabel: '3/3 rescue paths mapped',
                assessmentCoverageLabel: '1 operator handoff attached',
                blockerSummary: 'Content board, blocker view, and assessments remain usable even if the visual graph feed is down.',
                lessons: [
                  {
                    id: 'rescue-content-board',
                    title: 'Open the content board',
                    status: 'approved',
                    durationMinutes: 2,
                    mode: 'ops',
                    assessmentTitle: 'Operator handoff confirmed',
                    assessmentId: 'rescue-assessment-content',
                    objectiveCount: 1,
                    activityCount: 1,
                  },
                  {
                    id: 'rescue-content-blockers',
                    title: 'Review blocked modules',
                    status: 'approved',
                    durationMinutes: 3,
                    mode: 'ops',
                    assessmentTitle: 'Operator handoff confirmed',
                    assessmentId: 'rescue-assessment-content',
                    objectiveCount: 1,
                    activityCount: 1,
                  },
                  {
                    id: 'rescue-content-assessments',
                    title: 'Open assessment control board',
                    status: 'approved',
                    durationMinutes: 3,
                    mode: 'ops',
                    assessmentTitle: 'Operator handoff confirmed',
                    assessmentId: 'rescue-assessment-content',
                    objectiveCount: 1,
                    activityCount: 1,
                  },
                ],
                assessments: [
                  {
                    id: 'rescue-assessment-content',
                    subjectId: 'rescue-ops',
                    moduleId: 'rescue-content',
                    title: 'Operator handoff confirmed',
                    kind: 'manual',
                    trigger: 'module-complete',
                    triggerLabel: 'After fallback workflow review',
                    progressionGate: 'fallback-ready',
                    passingScore: 1,
                    subjectName: 'Canvas Rescue Lane',
                    moduleTitle: 'Use the real content boards now',
                    status: 'active',
                  },
                ],
              },
              {
                id: 'rescue-observability',
                title: 'Inspect failed curriculum feeds',
                status: 'draft',
                level: 'triage',
                lessonCount: 2,
                readyLessons: 1,
                gapCount: 1,
                provenance: 'rescue' as const,
                coverageLabel: '2/2 triage steps mapped',
                assessmentCoverageLabel: 'No assessment gate attached',
                blockerSummary: 'The route is intentionally showing rescue cards so operators can see what broke instead of getting an empty body.',
                lessons: [
                  {
                    id: 'rescue-observability-feeds',
                    title: 'List the failing curriculum feeds',
                    status: 'approved',
                    durationMinutes: 4,
                    mode: 'ops',
                    objectiveCount: 2,
                    activityCount: 2,
                  },
                  {
                    id: 'rescue-observability-fix',
                    title: 'Patch the feed or route renderer before release',
                    status: 'draft',
                    durationMinutes: 10,
                    mode: 'ops',
                    objectiveCount: 2,
                    activityCount: 3,
                  },
                ],
                assessments: [],
              },
            ],
          },
        ],
        totals: {
          modules: 3,
          lessons: 7,
          assessments: 2,
          readyLessons: 5,
          gaps: 2,
        },
      },
    ],
    summary: {
      subjects: 1,
      strands: 1,
      modules: 3,
      lessons: 7,
      assessments: 2,
      readyLessons: 5,
      blockedModules: 2,
    },
  };
}

function RescueVisibilityDeck({
  reason,
  failedSources,
  healthyFeeds,
  totalFeeds,
}: {
  reason: string;
  failedSources: string[];
  healthyFeeds: number;
  totalFeeds: number;
}) {
  const cards = [
    {
      title: 'Open content board',
      href: '/content',
      note: 'The live curriculum library is still the fastest way to verify subjects, modules, and lesson inventory.',
      background: '#ffffff',
      color: '#0f172a',
      border: '1px solid #dbe4ee',
    },
    {
      title: 'Inspect blockers',
      href: '/content?view=blocked',
      note: 'Go straight to modules missing ready lessons or assessment gates instead of trusting a blank surface.',
      background: '#FEF3C7',
      color: '#92400E',
      border: '1px solid #F59E0B',
    },
    {
      title: 'Open assessments',
      href: '/assessments',
      note: 'Progression gates and release readiness remain visible even when the canvas graph is degraded.',
      background: '#EDE9FE',
      color: '#5B21B6',
      border: '1px solid #C4B5FD',
    },
  ];

  return (
    <section
      aria-label="Canvas visibility rescue deck"
      style={{
        marginBottom: 18,
        padding: 18,
        borderRadius: 24,
        background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
        border: '1px solid rgba(99,102,241,0.22)',
        boxShadow: '0 24px 44px rgba(15,23,42,0.18)',
        display: 'grid',
        gap: 16,
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#94a3b8' }}>Visibility rescue</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc' }}>This page is deliberately painting rescue actions so production never reads as empty.</div>
        <div style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
          {reason}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill label={`${healthyFeeds}/${totalFeeds} feeds healthy`} tone="#082f49" text="#a5f3fc" />
          <Pill label={failedSources.length ? `Failed: ${failedSources.join(', ')}` : 'Fallback triggered by zero visible graph nodes'} tone="#431407" text="#fdba74" />
          <Pill label="Server-rendered rescue cards active" tone="#1e1b4b" text="#c4b5fd" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {cards.map((card) => (
          <div key={card.title} style={{ padding: 16, borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.18)', display: 'grid', gap: 12, minHeight: 168 }}>
            <div style={{ color: '#f8fafc', fontWeight: 900, fontSize: 18 }}>{card.title}</div>
            <div style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: 14 }}>{card.note}</div>
            <Link href={card.href} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'fit-content', borderRadius: 12, padding: '11px 14px', fontWeight: 800, textDecoration: 'none', background: card.background, color: card.color, border: card.border }}>
              Go now →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function CurriculumCanvasPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;

  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Curriculum Canvas"
        subtitle="The visual curriculum graph is blocked until the production LMS is wired to a real, production-safe API."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: curriculum canvas API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is present, but the current value is not production-safe. {API_BASE_DIAGNOSTIC.blockerDetail} Treating that as healthy would let a broken curriculum graph masquerade as a usable release surface.
          </>
        )}
        whyBlocked={[
          'Canvas is not decorative. It is used to inspect curriculum coverage, release blockers, lesson readiness, and assessment attachment depth before shipping content changes.',
          'Rendering a rescue lane while production wiring is missing still creates a dangerous illusion: reviewers can mistake fallback cards for a healthy curriculum graph.',
          'If the API base URL is missing or unsafe, the right move is a loud blocker with explicit fix steps, not a clever fallback that blurs the outage.',
        ]}
        verificationItems={[
          {
            surface: 'Curriculum graph',
            expected: 'Subjects, strands, modules, lessons, and assessment links load from the live LMS API',
            failure: 'Fallback-only rescue cards that look useful even though no production curriculum data is connected',
          },
          {
            surface: 'Release readiness cues',
            expected: 'Blocked modules, ready lessons, and assessment coverage reflect live data before deployment review',
            failure: 'Operators infer release status from placeholders or disconnected fallback content',
          },
          {
            surface: 'Configured API base URL',
            expected: `Uses a real HTTPS production host such as ${API_BASE_DIAGNOSTIC.expectedFormat}`,
            failure: `Placeholder, localhost, invalid, or non-HTTPS value${API_BASE_DIAGNOSTIC.configuredApiBase ? ` like ${API_BASE_DIAGNOSTIC.configuredApiBase}` : ''}`,
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Content blocker', href: '/content', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Assessments blocker', href: '/assessments', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const [
    subjectsResult,
    strandsResult,
    modulesResult,
    lessonsResult,
    assessmentsResult,
    canvasTreeResult,
  ] = await Promise.allSettled([
    fetchSubjects(),
    fetchStrands(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
    fetchCurriculumCanvasTree(),
  ]);

  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const strands = strandsResult.status === 'fulfilled' ? strandsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const canvasTree = canvasTreeResult.status === 'fulfilled' ? canvasTreeResult.value : null;

  let liveData: ReturnType<typeof buildCurriculumCanvasData>;
  let rescueData: ReturnType<typeof buildCurriculumCanvasDataFromTree>;
  let canvasBuildFailed = false;

  try {
    liveData = buildCurriculumCanvasData({ subjects, strands, modules, lessons, assessments, tree: canvasTree });
    rescueData = buildCurriculumCanvasDataFromTree(canvasTree);
  } catch {
    canvasBuildFailed = true;
    liveData = buildCurriculumCanvasData({ subjects: [], strands: [], modules: [], lessons: [], assessments: [], tree: null });
    rescueData = buildCurriculumCanvasDataFromTree(canvasTree);
  }

  const splitFeedFailures = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    strandsResult.status === 'rejected' ? 'strands' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    canvasBuildFailed ? 'canvas-render' : null,
  ].filter((value): value is string => Boolean(value));

  const liveGraphAvailable = liveData.summary.modules > 0;
  const rescueTreeAvailable = rescueData.summary.modules > 0;
  const treeOnlyNeededForRecovery = !liveGraphAvailable || splitFeedFailures.length > 0;
  const treeFailureShouldSurface = canvasTreeResult.status === 'rejected' && treeOnlyNeededForRecovery;

  const failedSources = [
    ...splitFeedFailures,
    treeFailureShouldSurface ? 'canvas-tree' : null,
  ].filter((value): value is string => Boolean(value));

  const hardRescueReason = API_BASE_DIAGNOSTIC.deploymentBlocked
    ? 'NEXT_PUBLIC_API_BASE_URL is missing in production, so the canvas is rendering an explicit rescue lane instead of pretending the empty route is acceptable.'
    : failedSources.length
      ? `These curriculum feeds failed: ${failedSources.join(', ')}. The route is rendering operator rescue cards so production never collapses into a blank page.`
      : 'The curriculum graph shaped into zero visible modules, so the route is rendering an explicit rescue lane instead of an empty shell.';

  const hardRescueData = buildHardRescueCanvasData(hardRescueReason);
  const data = liveGraphAvailable
    ? liveData
    : rescueTreeAvailable
      ? rescueData
      : hardRescueData;
  const usedRescueTree = !liveGraphAvailable && rescueTreeAvailable;
  const usedHardRescue = !liveGraphAvailable && !rescueTreeAvailable;
  const blendedFromTree = liveGraphAvailable && canvasTree && (liveData.summary.lessons > lessons.length || liveData.summary.assessments > assessments.length);
  const canvasMode = usedHardRescue
    ? 'hard-rescue'
    : usedRescueTree
      ? 'rescue-tree'
      : blendedFromTree
        ? 'blended'
        : 'live';

  const totalFeeds = treeOnlyNeededForRecovery ? 6 : 5;
  const healthyFeeds = totalFeeds - failedSources.length;

  return (
    <PageShell
      title="Curriculum Canvas"
      subtitle="A real visual curriculum surface for subject → strand → module → lesson → assessment navigation, authoring handoff, and release triage. It uses live LMS curriculum data instead of a decorative blank board."
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Content Library', href: '/content' },
      ]}
      aside={(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Pill label={`${data.summary.modules} modules on canvas`} tone="#EEF2FF" text="#3730A3" />
          <Pill label={`${data.summary.readyLessons} ready lessons`} tone="#DCFCE7" text="#166534" />
          <Pill label={`${data.summary.blockedModules} blocked modules`} tone={data.summary.blockedModules ? '#FEF3C7' : '#E0E7FF'} text={data.summary.blockedModules ? '#92400E' : '#3730A3'} />
        </div>
      )}
    >
      <FeedbackBanner message={query?.message} />

      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(67,20,7,0.98) 0%, rgba(88,28,12,0.94) 100%)', border: '1px solid rgba(251,146,60,0.32)', color: '#fed7aa', display: 'grid', gap: 6, boxShadow: '0 18px 32px rgba(15,23,42,0.18)' }}>
          <div style={{ fontWeight: 800 }}>Canvas is running in degraded mode.</div>
          <div style={{ lineHeight: 1.6 }}>
            {healthyFeeds}/{totalFeeds} curriculum feeds responded. These sources are currently down or stale: <strong>{failedSources.join(', ')}</strong>.
          </div>
          <div style={{ lineHeight: 1.6, fontSize: 14, color: '#fdba74' }}>
            You can still inspect modules and release blockers below, but counts may be partial until those feeds recover.
          </div>
        </div>
      ) : null}

      {usedRescueTree ? (
        <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(30,27,75,0.94) 100%)', border: '1px solid rgba(129,140,248,0.28)', color: '#c7d2fe', display: 'grid', gap: 6, boxShadow: '0 18px 32px rgba(15,23,42,0.18)' }}>
          <div style={{ fontWeight: 800 }}>Canvas recovered from the authoritative curriculum tree.</div>
          <div style={{ lineHeight: 1.6 }}>
            The split subject/strand/module feeds did not shape into a renderable graph, so this page switched to <code style={{ color: '#e0e7ff' }}>/api/v1/curriculum/canvas</code> to keep the route usable.
          </div>
        </div>
      ) : null}

      {blendedFromTree ? (
        <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(8,47,73,0.98) 0%, rgba(15,23,42,0.94) 100%)', border: '1px solid rgba(103,232,249,0.22)', color: '#a5f3fc', display: 'grid', gap: 6, boxShadow: '0 18px 32px rgba(15,23,42,0.18)' }}>
          <div style={{ fontWeight: 800 }}>Canvas is blending live feeds with rescue data.</div>
          <div style={{ lineHeight: 1.6 }}>
            Some modules were missing lesson or assessment detail, so the page filled those gaps from the authoritative tree instead of showing a skinny, misleading card.
          </div>
        </div>
      ) : null}

      {usedHardRescue ? (
        <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(49,46,129,0.98) 0%, rgba(15,23,42,0.96) 100%)', border: '1px solid rgba(165,180,252,0.3)', color: '#e0e7ff', display: 'grid', gap: 6, boxShadow: '0 18px 32px rgba(15,23,42,0.18)' }}>
          <div style={{ fontWeight: 800 }}>Canvas hard rescue is active.</div>
          <div style={{ lineHeight: 1.6 }}>
            Live shaping and tree rescue both produced zero module cards, so the route injected an explicit operations lane with visible actions instead of rendering a blank production body.
          </div>
        </div>
      ) : null}

      {(failedSources.length > 0 || usedRescueTree || usedHardRescue || data.summary.modules === 0) ? (
        <RescueVisibilityDeck
          reason={hardRescueReason}
          failedSources={failedSources}
          healthyFeeds={healthyFeeds}
          totalFeeds={totalFeeds}
        />
      ) : null}

      <CurriculumCanvas
        data={data}
        failedSources={failedSources}
        generatedAt={canvasTree?.meta?.generatedAt ?? null}
        mode={canvasMode}
        quickUpdateLessonStatusAction={quickUpdateLessonStatusAction}
        quickUpdateCanvasLessonAction={quickUpdateCanvasLessonAction}
        quickLinkCanvasLessonAssessmentAction={quickLinkCanvasLessonAssessmentAction}
        quickUpdateCanvasModuleAction={quickUpdateCanvasModuleAction}
        bulkUpdateCanvasModuleLessonsAction={bulkUpdateCanvasModuleLessonsAction}
        createCanvasModuleLessonShellsAction={createCanvasModuleLessonShellsAction}
        quickUpdateAssessmentStatusAction={quickUpdateAssessmentStatusAction}
        quickUpdateCanvasAssessmentAction={quickUpdateCanvasAssessmentAction}
        createCanvasAssessmentQuickAction={createCanvasAssessmentQuickAction}
      />
    </PageShell>
  );
}
