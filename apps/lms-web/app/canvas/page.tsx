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
import { Card, MetricList, PageShell } from '../../lib/ui';

export default async function CanvasPage() {
  const [subjects, strands, modules, lessons, assessments, tree] = await Promise.all([
    fetchSubjects(),
    fetchStrands(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
    fetchCurriculumCanvasTree(),
  ]);

  const fallbackData = buildCurriculumCanvasData({ subjects, strands, modules, lessons, assessments });
  const canvasData = tree?.root
    ? buildCurriculumCanvasDataFromTree(tree)
    : fallbackData;

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
