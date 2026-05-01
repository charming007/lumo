import { CurriculumCanvas } from '../../components/curriculum-canvas';
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
import { fetchAssessments, fetchCurriculumCanvasTree, fetchCurriculumModules, fetchLessons, fetchStrands, fetchSubjects } from '../../lib/api';
import { buildCurriculumCanvasData, buildCurriculumCanvasDataFromTree } from '../../lib/curriculum-canvas';
import type { CurriculumCanvasApiTree } from '../../lib/curriculum-canvas';
import type { Assessment, CurriculumModule, Lesson, Strand, Subject } from '../../lib/types';
import { Card, MetricList, PageShell } from '../../lib/ui';

const emptySubjects: Subject[] = [];
const emptyStrands: Strand[] = [];
const emptyModules: CurriculumModule[] = [];
const emptyLessons: Lesson[] = [];
const emptyAssessments: Assessment[] = [];

export default async function CanvasPage() {
  const [subjectsResult, strandsResult, modulesResult, lessonsResult, assessmentsResult, treeResult] = await Promise.allSettled([
    fetchSubjects(),
    fetchStrands(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
    fetchCurriculumCanvasTree(),
  ]);

  const failedSources: string[] = [];
  if (subjectsResult.status === 'rejected') failedSources.push('subjects');
  if (strandsResult.status === 'rejected') failedSources.push('strands');
  if (modulesResult.status === 'rejected') failedSources.push('modules');
  if (lessonsResult.status === 'rejected') failedSources.push('lessons');
  if (assessmentsResult.status === 'rejected') failedSources.push('assessments');
  if (treeResult.status === 'rejected') failedSources.push('canvas tree');

  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : emptySubjects;
  const strands = strandsResult.status === 'fulfilled' ? strandsResult.value : emptyStrands;
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : emptyModules;
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : emptyLessons;
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : emptyAssessments;
  const tree: CurriculumCanvasApiTree | null = treeResult.status === 'fulfilled' ? treeResult.value : null;

  const liveData = buildCurriculumCanvasData({ subjects, strands, modules, lessons, assessments, tree });
  const rescueData = tree?.root ? buildCurriculumCanvasDataFromTree(tree) : null;
  const canvasData = liveData.subjects.length ? liveData : (rescueData ?? liveData);
  const canvasMode = liveData.subjects.length
    ? failedSources.length
      ? 'blended'
      : 'live'
    : rescueData?.subjects.length
      ? failedSources.length
        ? 'hard-rescue'
        : 'rescue-tree'
      : failedSources.length
        ? 'hard-rescue'
        : 'live';

  return (
    <PageShell
      title="Curriculum Canvas"
      subtitle="View the live curriculum graph across subjects, strands, modules, lessons, and assessment gates."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Canvas summary" eyebrow="Live API">
          <MetricList
            items={[
              { label: 'Subjects', value: String(canvasData.summary.subjects) },
              { label: 'Modules', value: String(canvasData.summary.modules) },
              { label: 'Lessons', value: String(canvasData.summary.lessons) },
              { label: 'Assessments', value: String(canvasData.summary.assessments) },
            ]}
          />
        </Card>
      }
    >
      <CurriculumCanvas
        data={canvasData}
        failedSources={failedSources}
        generatedAt={tree?.meta?.generatedAt ?? null}
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
        createStrandAction={createStrandAction}
        updateStrandAction={updateStrandAction}
        subjectOptions={subjects.map((subject) => ({ id: subject.id, name: subject.name }))}
      />
    </PageShell>
  );
}
