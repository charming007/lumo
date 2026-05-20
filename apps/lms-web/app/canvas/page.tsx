import Link from 'next/link';
import {
  bulkUpdateCanvasModuleLessonsAction,
  createCanvasAssessmentQuickAction,
  createCanvasModuleLessonShellsAction,
  createStrandAction,
  quickLinkCanvasLessonAssessmentAction,
  quickUpdateAssessmentStatusAction,
  quickUpdateCanvasAssessmentAction,
  quickUpdateCanvasLessonAction,
  quickUpdateCanvasModuleAction,
  quickUpdateLessonStatusAction,
  updateStrandAction,
} from '../actions';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { CurriculumCanvas } from '../../components/curriculum-canvas';
import { fetchAssessments, fetchCurriculumCanvasTree, fetchCurriculumModules, fetchLessons, fetchStrands, fetchSubjects } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { buildCurriculumCanvasData, buildCurriculumCanvasDataFromTree } from '../../lib/curriculum-canvas';
import { buildCanvasReturnPath } from '../../lib/content-return-path';
import { Card, PageShell } from '../../lib/ui';

function normalizeRouteParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default async function CanvasPage({ searchParams }: { searchParams?: Promise<{ message?: string; subject?: string | string[]; module?: string | string[]; readiness?: string | string[]; q?: string | string[] }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Curriculum Canvas"
        subtitle="Production wiring is incomplete, so the graph view is blocked instead of pretending curriculum ops are live."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: canvas API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} Leaving the canvas route up would advertise live curriculum editing even though the LMS is not wired to a production-safe backend.
          </>
        )}
        whyBlocked={[
          'Canvas is an editing surface, not a decorative read-only graph. If production API wiring is broken, this route should block before operators mistake it for a live authoring tool.',
          'Dashboard and Content Library already block on the same deployment trust failure. Letting Canvas stay reachable would create a fake side door around the exact sign-off guard those routes enforce.',
          'A loud blocker is safer than a half-live curriculum map that encourages lesson or gate changes against the wrong backend target.',
        ]}
        verificationItems={[
          {
            surface: 'Canvas route',
            expected: 'Subject, module, lesson, and gate data load from the real production API host',
            failure: 'Graph UI opens while NEXT_PUBLIC_API_BASE_URL is missing, placeholder-only, or pointed at localhost',
          },
          {
            surface: 'Scoped blocker handoff',
            expected: 'Dashboard blocker links into /canvas only after production API wiring is valid',
            failure: 'Operators can click from the dashboard into a live-looking canvas during a broken deployment',
          },
          {
            surface: 'Curriculum actions',
            expected: 'Inline lesson, module, strand, and assessment actions only appear when the route is backed by a production-safe API target',
            failure: 'Editing affordances remain visible even though deployment trust is already broken upstream',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Content library', href: '/content', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Settings blocker', href: '/settings', background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const returnPath = buildCanvasReturnPath(query);
  const requestedSubjectId = normalizeRouteParam(query?.subject).trim();
  const requestedModuleId = normalizeRouteParam(query?.module).trim();
  const createLessonHref = `/content/lessons/new?${new URLSearchParams({
    ...(requestedSubjectId ? { subjectId: requestedSubjectId } : {}),
    ...(requestedModuleId ? { moduleId: requestedModuleId } : {}),
    from: returnPath,
  }).toString()}`;
  const [subjectsResult, strandsResult, modulesResult, lessonsResult, assessmentsResult, treeResult] = await Promise.allSettled([
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
  const tree = treeResult.status === 'fulfilled' ? treeResult.value : null;
  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    strandsResult.status === 'rejected' ? 'strands' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    treeResult.status === 'rejected' ? 'canvas tree' : null,
  ].filter((value): value is string => Boolean(value));
  const criticalCanvasFailures = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    strandsResult.status === 'rejected' ? 'strands' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
  ].filter((value): value is string => Boolean(value));
  const hasEmptyAuthoringGraph = subjectsResult.status === 'fulfilled'
    && modulesResult.status === 'fulfilled'
    && subjects.length === 0
    && modules.length === 0;

  if (criticalCanvasFailures.length || hasEmptyAuthoringGraph) {
    const blockerDetail = hasEmptyAuthoringGraph
      ? 'The live subjects and modules feeds both resolved empty, so Canvas has no trustworthy authoring spine to map. Leaving the route interactive here would make a broken or hollow deployment look like “curriculum just needs filling in,” which is how people green-light a stack where learners still cannot launch real lessons.'
      : criticalCanvasFailures.length === 1
        ? `The ${criticalCanvasFailures[0]} feed failed to load from the live API. Leaving Canvas interactive here would let operators edit modules, lessons, strands, or assessment gates against a partial curriculum graph.`
        : `The ${criticalCanvasFailures.join(', ')} feeds failed to load from the live API. Leaving Canvas interactive here would let operators edit modules, lessons, strands, or assessment gates against a partial curriculum graph.`;

    return (
      <DeploymentBlockerCard
        title="Curriculum Canvas"
        subtitle={hasEmptyAuthoringGraph
          ? 'Canvas is blocked because the live curriculum spine came back empty, so rescue-mode authoring would be bullshit deployment theatre.'
          : 'Canvas is a live authoring surface, not a decorative map. If the core curriculum feeds are down, the route should block instead of inviting blind edits.'}
        blockerHeadline={hasEmptyAuthoringGraph
          ? 'Deployment blocker: live curriculum spine came back empty.'
          : 'Deployment blocker: curriculum authoring feeds are degraded.'}
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length > criticalCanvasFailures.length
              ? `Additional degraded feed${failedSources.length - criticalCanvasFailures.length === 1 ? '' : 's'}: ${failedSources.filter((source) => !criticalCanvasFailures.includes(source)).join(', ')}.`
              : ''}
          </>
        )}
        whyBlocked={hasEmptyAuthoringGraph
          ? [
              'An empty live subjects + modules spine is not a cute empty state. It means the deployment cannot prove any real curriculum lanes exist, so Canvas should stop cold.',
              'If rescue mode or fallback lesson creation stays reachable here, operators can mistake a hollow backend for a normal authoring backlog and ship learner-facing dead ends.',
              'The dashboard already blocks when release readiness goes empty. Canvas needs the same honesty for the authoring graph instead of pretending the absence of curriculum is just another workflow choice.',
            ]
          : [
              'Canvas exposes inline curriculum write actions. A polite warning banner is too weak when the lesson, module, strand, or gate graph is incomplete.',
              'Partial curriculum context can make a broken deployment look like a harmless content gap, which is how people create the wrong lesson shells or wire assessments onto stale modules.',
              'The fallback create-lesson CTA is only safe when the authoring feeds are healthy enough to trust the scoped context.',
            ]}
        verificationItems={hasEmptyAuthoringGraph
          ? [
              {
                surface: 'Live curriculum spine',
                expected: 'Subjects and modules both return real data before Canvas exposes authoring or rescue-mode graph controls',
                failure: 'Canvas falls through to a fake-empty map or lesson-create CTA while the live curriculum spine is blank',
              },
              {
                surface: 'Deployment trust handoff',
                expected: 'Operators see an explicit blocker explaining that empty live curriculum means deployment review is unsafe',
                failure: 'The route implies authors merely need to create content instead of admitting the live LMS currently has no trustworthy curriculum graph',
              },
              {
                surface: 'Scoped recovery flow',
                expected: 'Reviewers return to the blocker stack or dashboard until the live curriculum feeds recover',
                failure: 'Canvas offers rescue authoring shortcuts that can hide a hollow backend behind normal-looking workflow copy',
              },
            ]
          : [
              {
                surface: 'Curriculum graph',
                expected: 'Subjects, strands, modules, lessons, and assessment gates load from the live API before any write surface appears',
                failure: 'Canvas still shows editable graph controls while one of the core authoring feeds is missing',
              },
              {
                surface: 'Inline authoring actions',
                expected: 'Lesson, module, strand, and assessment quick actions only appear after the full authoring graph loads',
                failure: 'Operators can create or edit curriculum nodes against stale or partial context',
              },
              {
                surface: 'Authoring handoff',
                expected: 'The route blocks until feeds recover, then scoped lesson-creation links reopen with trustworthy subject/module context',
                failure: 'A fallback CTA launches authoring while the curriculum graph itself is degraded',
              },
            ]}
        docs={hasEmptyAuthoringGraph
          ? [
              { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
              { label: 'Content blocker stack', href: '/content?view=blocked', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
              { label: 'Review scoped handoff', href: returnPath, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
            ]
          : [
              { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
              { label: 'Content library', href: '/content', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
              { label: 'Review blocker stack', href: returnPath, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
            ]}
      />
    );
  }

  const canvasData = subjects.length && modules.length
    ? buildCurriculumCanvasData({ subjects, strands, modules, lessons, assessments, tree })
    : buildCurriculumCanvasDataFromTree(tree);

  const mode = subjects.length && modules.length
    ? tree
      ? 'blended'
      : 'live'
    : tree
      ? 'rescue-tree'
      : 'hard-rescue';

  const subjectOptions = subjects.map((subject) => ({ id: subject.id, name: subject.name }));

  return (
    <PageShell
      title="Curriculum Canvas"
      subtitle="Live curriculum graph with inline lesson, gate, strand, and module controls. The route is back because the wiring already exists — blocking it was pure pilot-era theatre."
      aside={(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/content" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open content library
          </Link>
          <Link href="/content?view=blocked" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#FFF7ED', color: '#9A3412', textDecoration: 'none', border: '1px solid #FED7AA' }}>
            Review blocker stack
          </Link>
        </div>
      )}
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Canvas is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      {canvasData.subjects.length ? (
        <CurriculumCanvas
          data={canvasData}
          failedSources={failedSources}
          generatedAt={tree?.meta?.generatedAt ?? null}
          mode={mode}
          quickUpdateLessonStatusAction={quickUpdateLessonStatusAction}
          quickUpdateCanvasLessonAction={quickUpdateCanvasLessonAction}
          quickLinkCanvasLessonAssessmentAction={quickLinkCanvasLessonAssessmentAction}
          quickUpdateCanvasModuleAction={quickUpdateCanvasModuleAction}
          bulkUpdateCanvasModuleLessonsAction={bulkUpdateCanvasModuleLessonsAction}
          createCanvasModuleLessonShellsAction={createCanvasModuleLessonShellsAction}
          quickUpdateAssessmentStatusAction={quickUpdateAssessmentStatusAction}
          quickUpdateCanvasAssessmentAction={quickUpdateCanvasAssessmentAction}
          createCanvasAssessmentQuickAction={createCanvasAssessmentQuickAction}
          subjectOptions={subjectOptions}
          createStrandAction={createStrandAction}
          updateStrandAction={updateStrandAction}
          returnPath={returnPath}
        />
      ) : (
        <Card title="Canvas data unavailable" eyebrow="Fallback still alive">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              The route itself is live again, but neither the main curriculum feeds nor the rescue tree returned enough structure to draw the graph yet.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/content" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#0f172a', color: 'white', textDecoration: 'none' }}>
                Open content board
              </Link>
              <Link href={createLessonHref} style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
                Create lesson
              </Link>
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
