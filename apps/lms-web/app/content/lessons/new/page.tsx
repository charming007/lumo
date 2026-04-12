import Link from 'next/link';
import { LessonCreateForm } from '../../../../components/lesson-create-form';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { fetchAssessments, fetchCurriculumModules, fetchLessons, fetchSubjects } from '../../../../lib/api';
import { Card, PageShell, Pill, responsiveGrid } from '../../../../lib/ui';
import { createLessonAction } from '../../../actions';

function statusTone(status: string) {
  if (status === 'published' || status === 'approved') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'review') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

export default async function NewLessonPage({ searchParams }: { searchParams?: Promise<{ subjectId?: string; moduleId?: string; duplicate?: string; from?: string; message?: string }> }) {
  const query = await searchParams;
  const [subjects, modules, lessons, assessments] = await Promise.all([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
  ]);

  const scopedSubjectId = query?.subjectId ?? '';
  const scopedModuleId = query?.moduleId ?? '';
  const duplicateLessonId = query?.duplicate ?? '';
  const duplicateLesson = lessons.find((lesson) => lesson.id === duplicateLessonId) ?? null;
  const activeModule = modules.find((module) => module.id === scopedModuleId)
    ?? modules.find((module) => module.id === duplicateLesson?.moduleId)
    ?? modules[0]
    ?? null;
  const relatedAssessments = activeModule
    ? assessments.filter((assessment) => assessment.moduleId === activeModule.id || assessment.moduleTitle === activeModule.title)
    : [];
  const siblingLessons = activeModule
    ? lessons.filter((lesson) => lesson.moduleId === activeModule.id || lesson.moduleTitle === activeModule.title)
    : [];
  const returnPath = query?.from || '/content';

  return (
    <PageShell
      title="Lesson Studio"
      subtitle="Full-page lesson authoring for real curriculum work: objectives, localization, assessment checks, and the learner activity spine in one place."
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Content Library', href: returnPath },
        { label: 'Lesson Studio' },
      ]}
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={returnPath} style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Back to library
          </Link>
          <Link href="/english" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
            Open English Studio
          </Link>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title={String(subjects.length)} eyebrow="Subjects available">
          <div style={{ color: '#64748b' }}>Pick the right lane first so this lesson lands in the proper curriculum spine.</div>
        </Card>
        <Card title={String(modules.length)} eyebrow="Modules available">
          <div style={{ color: '#64748b' }}>Authoring is attached to real modules, not floating random lesson records.</div>
        </Card>
        <Card title={duplicateLesson ? duplicateLesson.title : 'Fresh pack'} eyebrow="Starting point">
          <div style={{ color: '#64748b' }}>{duplicateLesson ? 'Duplicating an existing lesson so authors can move faster without rebuilding the whole flow.' : 'No duplicate selected — start clean or apply one of the built-in quick templates.'}</div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 16, marginBottom: 20 }}>
        <LessonCreateForm
          subjects={subjects}
          modules={modules}
          lessons={lessons}
          action={createLessonAction}
          initialSubjectId={scopedSubjectId}
          initialModuleId={scopedModuleId}
          duplicateLessonId={duplicateLessonId}
          returnPath={returnPath}
        />

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Card title={activeModule?.title ?? 'No module selected yet'} eyebrow="Current authoring lane">
            <div style={{ display: 'grid', gap: 12 }}>
              {activeModule ? (
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Pill label={activeModule.subjectName} />
                    <Pill label={activeModule.level} tone="#F8FAFC" text="#334155" />
                    <Pill label={activeModule.status} tone={statusTone(activeModule.status).tone} text={statusTone(activeModule.status).text} />
                  </div>
                  <div style={{ color: '#64748b', lineHeight: 1.7 }}>
                    {activeModule.lessonCount} planned lesson{activeModule.lessonCount === 1 ? '' : 's'} in this module • {siblingLessons.length} already exist • {relatedAssessments.length} assessment gate{relatedAssessments.length === 1 ? '' : 's'} wired.
                  </div>
                </>
              ) : (
                <div style={{ color: '#64748b' }}>Pick a module to see its publishing context.</div>
              )}
            </div>
          </Card>

          <Card title="Assessment context" eyebrow="Before authors get cocky">
            <div style={{ display: 'grid', gap: 12 }}>
              {relatedAssessments.length ? relatedAssessments.map((assessment) => (
                <div key={assessment.id} style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <strong>{assessment.title}</strong>
                    <Pill label={assessment.status} tone={statusTone(assessment.status).tone} text={statusTone(assessment.status).text} />
                  </div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>{assessment.triggerLabel || assessment.trigger} • Gate: {assessment.progressionGate}</div>
                </div>
              )) : (
                <div style={{ padding: 14, borderRadius: 16, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', fontWeight: 700 }}>
                  No assessment gate is linked to this module yet. Shipping lessons into that lane without a progression check is sloppy.
                </div>
              )}
            </div>
          </Card>

          <Card title="Module lesson baseline" eyebrow="What already exists">
            <div style={{ display: 'grid', gap: 10 }}>
              {siblingLessons.length ? siblingLessons.slice(0, 6).map((lesson) => (
                <div key={lesson.id} style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <strong>{lesson.title}</strong>
                    <Pill label={lesson.status} tone={statusTone(lesson.status).tone} text={statusTone(lesson.status).text} />
                  </div>
                  <div style={{ color: '#64748b', marginBottom: 8 }}>{lesson.durationMinutes} min • {lesson.mode}</div>
                  <Link href={`/content/lessons/${lesson.id}?from=${encodeURIComponent(returnPath)}`} style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>
                    Open lesson pack →
                  </Link>
                </div>
              )) : (
                <div style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748b' }}>
                  No lessons exist in this module yet. Good. Build the first proper pack instead of another placeholder record.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
