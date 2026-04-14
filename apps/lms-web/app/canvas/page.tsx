import { CurriculumCanvas } from '../../components/curriculum-canvas';
import { fetchAssessments, fetchCurriculumModules, fetchLessons, fetchStrands, fetchSubjects } from '../../lib/api';
import { buildCurriculumCanvasData } from '../../lib/curriculum-canvas';
import { PageShell, Pill } from '../../lib/ui';

export default async function CurriculumCanvasPage() {
  const [subjectsResult, strandsResult, modulesResult, lessonsResult, assessmentsResult] = await Promise.allSettled([
    fetchSubjects(),
    fetchStrands(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
  ]);

  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const strands = strandsResult.status === 'fulfilled' ? strandsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];

  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    strandsResult.status === 'rejected' ? 'strands' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
  ].filter(Boolean);

  const data = buildCurriculumCanvasData({ subjects, strands, modules, lessons, assessments });

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
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Canvas is rendering in degraded mode because these curriculum feeds are down: {failedSources.join(', ')}.
        </div>
      ) : null}

      <CurriculumCanvas data={data} />
    </PageShell>
  );
}
