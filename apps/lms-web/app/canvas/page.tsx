import { CurriculumCanvas } from '../../components/curriculum-canvas';
import { fetchAssessments, fetchCurriculumCanvasTree, fetchCurriculumModules, fetchLessons, fetchStrands, fetchSubjects } from '../../lib/api';
import { buildCurriculumCanvasData, buildCurriculumCanvasDataFromTree } from '../../lib/curriculum-canvas';
import { PageShell, Pill } from '../../lib/ui';

export default async function CurriculumCanvasPage() {
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

  const liveData = buildCurriculumCanvasData({ subjects, strands, modules, lessons, assessments, tree: canvasTree });
  const rescueData = buildCurriculumCanvasDataFromTree(canvasTree);
  const data = liveData.summary.modules > 0 ? liveData : rescueData;
  const usedRescueTree = liveData.summary.modules === 0 && rescueData.summary.modules > 0;
  const blendedFromTree = liveData.summary.modules > 0 && canvasTree && (liveData.summary.lessons > lessons.length || liveData.summary.assessments > assessments.length);

  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    strandsResult.status === 'rejected' ? 'strands' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    canvasTreeResult.status === 'rejected' ? 'canvas-tree' : null,
  ].filter((value): value is string => Boolean(value));

  const totalFeeds = 6;
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
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 18, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Canvas is running in degraded mode.</div>
          <div style={{ lineHeight: 1.6 }}>
            {healthyFeeds}/{totalFeeds} curriculum feeds responded. These sources are currently down or stale: <strong>{failedSources.join(', ')}</strong>.
          </div>
          <div style={{ lineHeight: 1.6, fontSize: 14 }}>
            You can still inspect modules and release blockers below, but counts may be partial until those feeds recover.
          </div>
        </div>
      ) : null}

      {usedRescueTree ? (
        <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 18, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Canvas recovered from the authoritative curriculum tree.</div>
          <div style={{ lineHeight: 1.6 }}>
            The split subject/strand/module feeds did not shape into a renderable graph, so this page switched to <code>/api/v1/curriculum/canvas</code> to keep the route usable.
          </div>
        </div>
      ) : null}

      {blendedFromTree ? (
        <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 18, background: '#ecfeff', border: '1px solid #a5f3fc', color: '#155e75', display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Canvas is blending live feeds with rescue data.</div>
          <div style={{ lineHeight: 1.6 }}>
            Some modules were missing lesson or assessment detail, so the page filled those gaps from the authoritative tree instead of showing a skinny, misleading card.
          </div>
        </div>
      ) : null}

      <CurriculumCanvas data={data} failedSources={failedSources} />
    </PageShell>
  );
}
