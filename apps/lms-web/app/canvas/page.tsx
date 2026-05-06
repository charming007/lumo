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
import { FeedbackBanner } from '../../components/feedback-banner';
import { CurriculumCanvas } from '../../components/curriculum-canvas';
import { fetchAssessments, fetchCurriculumCanvasTree, fetchCurriculumModules, fetchLessons, fetchStrands, fetchSubjects } from '../../lib/api';
import { buildCurriculumCanvasData, buildCurriculumCanvasDataFromTree } from '../../lib/curriculum-canvas';
import { Card, PageShell } from '../../lib/ui';

export default async function CanvasPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
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
          returnPath="/canvas"
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
              <Link href="/content/lessons/new?from=%2Fcanvas" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
                Create lesson
              </Link>
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
