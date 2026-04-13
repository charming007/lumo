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

export default async function NewLessonPage({ searchParams }: { searchParams?: Promise<{ subjectId?: string; moduleId?: string; duplicate?: string; from?: string; message?: string; createdLessonId?: string; createdLessonTitle?: string }> }) {
  const query = await searchParams;
  const [subjectsResult, modulesResult, lessonsResult, assessmentsResult] = await Promise.allSettled([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
  ]);

  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
  ].filter(Boolean);

  const scopedSubjectId = query?.subjectId ?? '';
  const scopedModuleId = query?.moduleId ?? '';
  const duplicateLessonId = query?.duplicate ?? '';
  const createdLessonId = query?.createdLessonId ?? '';
  const createdLessonTitle = query?.createdLessonTitle ?? '';
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
  const authoringDependenciesReady = subjects.length > 0 && modules.length > 0 && lessonsResult.status === 'fulfilled';

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
          <Link href="/guide#interactive-authoring" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
            Authoring walkthrough
          </Link>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />

      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Lesson Studio is running in degraded mode: {failedSources.join(', ')} feed {failedSources.length === 1 ? 'is' : 'are'} unavailable.
        </div>
      ) : null}

      {createdLessonId ? (
        <section style={{ marginBottom: 20, padding: 22, borderRadius: 24, background: 'linear-gradient(135deg, #ecfdf5 0%, #eef2ff 100%)', border: '1px solid #bbf7d0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ maxWidth: 760 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#166534', marginBottom: 8 }}>Lesson created</div>
              <h2 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>{createdLessonTitle || 'New lesson pack'} is live</h2>
              <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.7 }}>
                The create step is done. No more dumping authors onto a dead-looking page right after submit — choose the next move that actually makes sense.
              </p>
            </div>
            <Pill label={`Lesson ID: ${createdLessonId}`} tone="#DCFCE7" text="#166534" />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <Link href={`/content/lessons/${createdLessonId}?from=${encodeURIComponent(returnPath)}`} style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
              Open lesson pack
            </Link>
            <Link href={`${returnPath}?message=${encodeURIComponent(`Lesson ${createdLessonTitle || 'created'} is ready in the library`)}`} style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
              Back to library
            </Link>
            <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(scopedSubjectId || activeModule?.subjectId || '')}&moduleId=${encodeURIComponent(scopedModuleId || activeModule?.id || '')}&from=${encodeURIComponent(returnPath)}`} style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: 'white', color: '#334155', textDecoration: 'none', border: '1px solid #cbd5e1' }}>
              Create another lesson
            </Link>
            <Link href={`/content/lessons/new?duplicate=${createdLessonId}&from=${encodeURIComponent(returnPath)}`} style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: 'white', color: '#5b21b6', textDecoration: 'none', border: '1px solid #ddd6fe' }}>
              Duplicate this pack
            </Link>
          </div>
        </section>
      ) : null}

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

      <section style={{ display: 'grid', gap: 20, marginBottom: 20 }}>
        {authoringDependenciesReady ? (
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
        ) : (
          <Card title="Authoring temporarily unavailable" eyebrow="Missing dependencies">
            {sectionAlert(
              failedSources.length
                ? 'The lesson form is paused until subjects, modules, and lesson baselines load again. Keeping the route alive is better than exploding during a demo.'
                : 'Create flow needs subjects, modules, and lesson baselines before it can open.'
              , 'warning')}
          </Card>
        )}

        <div style={{ ...responsiveGrid(320), alignItems: 'start' }}>
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
                sectionAlert(failedSources.length ? 'Module context is unavailable because the module feed failed.' : 'Pick a module to see its publishing context.', failedSources.length ? 'warning' : 'neutral')
              )}
            </div>
          </Card>


          <Card title="Authoring route map" eyebrow="Use the right lane, not guesswork">
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['1. Lock the curriculum lane', activeModule ? `${activeModule.subjectName} → ${activeModule.title} is the current publishing lane. Keep the lesson here unless the curriculum spine itself is wrong.` : 'Pick a real subject and module before writing anything.'],
                ['2. Build the interaction properly', 'If the lesson uses taps, options, expected answers, media prompts, or speaking evidence, stay in Lesson Studio and build the full activity spine. The quick create shortcut is not enough.'],
                ['3. Gate before publish', relatedAssessments.length ? `${relatedAssessments.length} assessment gate${relatedAssessments.length === 1 ? '' : 's'} are already visible for this module, so authors can align lesson evidence before anyone hits publish.` : 'No assessment gate is linked yet, so treat this lane as structurally incomplete until that is fixed.'],
                ['4. Hand off cleanly', 'After save, open the lesson pack, sanity-check the activity flow, then move to assignments and reports only when the lesson is genuinely release-safe.'],
              ].map(([title, detail]) => (
                <div key={title} style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/guide#lesson-studio" style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
                  Open lesson studio guide →
                </Link>
                <Link href="/guide#interactive-authoring" style={{ color: '#7C3AED', fontWeight: 800, textDecoration: 'none' }}>
                  Interactive lesson tutorial →
                </Link>
              </div>
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
                sectionAlert(
                  assessmentsResult.status === 'rejected'
                    ? 'Assessment gate context is unavailable because the feed failed.'
                    : 'No assessment gate is linked to this module yet. Shipping lessons into that lane without a progression check is sloppy.',
                  assessmentsResult.status === 'rejected' ? 'warning' : 'neutral'
                )
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
                sectionAlert(
                  lessonsResult.status === 'rejected'
                    ? 'Existing lesson baseline is unavailable because the lesson feed failed.'
                    : 'No lessons exist in this module yet. Good. Build the first proper pack instead of another placeholder record.',
                  lessonsResult.status === 'rejected' ? 'warning' : 'neutral'
                )
              )}
            </div>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
