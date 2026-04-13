import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LessonEditorForm } from '../../../../components/lesson-editor-form';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { fetchAssessments, fetchCurriculumModules, fetchLesson, fetchLessons, fetchSubjects } from '../../../../lib/api';
import { Card, PageShell, Pill, responsiveGrid } from '../../../../lib/ui';
import { updateLessonAction } from '../../../actions';

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

export default async function LessonDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string; message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const returnPath = query?.from || '/content';

  const [lessonResult, subjectsResult, modulesResult, lessonsResult, assessmentsResult] = await Promise.allSettled([
    fetchLesson(id),
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
  ]);

  const baseSubjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const baseModules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const lesson = lessonResult.status === 'fulfilled'
    ? lessonResult.value
    : lessons.find((item) => item.id === id) ?? null;

  if (!lesson) {
    notFound();
  }

  const detailRecoveredFromList = lessonResult.status === 'rejected';
  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
  ].filter(Boolean);

  const fallbackSubject = lesson.subjectId || lesson.subjectName
    ? {
        id: lesson.subjectId || `fallback-subject-${lesson.id}`,
        name: lesson.subjectName || 'Current lesson subject',
        icon: 'menu_book',
        order: 0,
      }
    : null;
  const subjects = fallbackSubject && !baseSubjects.some((subject) => subject.id === fallbackSubject.id)
    ? [fallbackSubject, ...baseSubjects]
    : baseSubjects;

  const fallbackModule = lesson.moduleId || lesson.moduleTitle
    ? {
        id: lesson.moduleId || `fallback-module-${lesson.id}`,
        subjectId: lesson.subjectId || fallbackSubject?.id || '',
        subjectName: lesson.subjectName || fallbackSubject?.name || 'Current lesson subject',
        title: lesson.moduleTitle || 'Current lesson module',
        level: 'unknown',
        lessonCount: 0,
        status: lesson.status || 'draft',
        strandName: 'Recovered context',
      }
    : null;
  const modules = fallbackModule && !baseModules.some((module) => module.id === fallbackModule.id)
    ? [fallbackModule, ...baseModules]
    : baseModules;

  const activeModule = modules.find((module) => module.id === lesson.moduleId || module.title === lesson.moduleTitle) ?? null;
  const activeModuleSubjectName = activeModule
    ? ('subjectName' in activeModule ? activeModule.subjectName : undefined) ?? lesson.subjectName ?? fallbackSubject?.name ?? 'Current lesson subject'
    : null;
  const relatedAssessments = assessments.filter((assessment) => assessment.moduleId === activeModule?.id || assessment.moduleTitle === activeModule?.title);
  const siblingLessons = lessons.filter((item) => item.id !== lesson.id && (item.moduleId === activeModule?.id || item.moduleTitle === activeModule?.title));
  const readinessChecks: Array<[string, boolean]> = [
    ['Clear title', lesson.title.trim().length >= 8],
    ['Enough duration', Number(lesson.durationMinutes) >= 8],
    ['Objectives present', (lesson.learningObjectives?.length ?? 0) > 0],
    ['Assessment attached', (lesson.lessonAssessment?.items?.length ?? 0) > 0],
    ['Activity spine built', (lesson.activitySteps?.length ?? lesson.activities?.length ?? 0) >= 3],
  ];
  const readinessScore = readinessChecks.filter(([, passed]) => passed).length;
  const editorDependenciesReady = subjects.length > 0 && modules.length > 0;

  return (
    <PageShell
      title={lesson.title}
      subtitle="Edit the real lesson payload without leaving the LMS: structure, localization, evidence, assessment items, and the exact learner flow."
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: returnPath === '/english' ? 'English Curriculum Studio' : 'Content Library', href: returnPath },
        { label: 'Lesson Studio', href: `/content/lessons/new?from=${encodeURIComponent(returnPath)}` },
        { label: lesson.title },
      ]}
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={returnPath} style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Back to board
          </Link>
          <Link href={`/content/lessons/new?duplicate=${lesson.id}&from=${encodeURIComponent(returnPath)}`} style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
            Duplicate lesson
          </Link>
        </div>
      }
    >
      <FeedbackBanner message={query?.message} />

      {detailRecoveredFromList ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontWeight: 700 }}>
          Live lesson detail was temporarily unavailable, so the editor recovered from the latest library snapshot and kept the page usable.
        </div>
      ) : null}

      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Lesson detail is running in degraded mode: {failedSources.join(', ')} feed {failedSources.length === 1 ? 'is' : 'are'} unavailable.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title={`${readinessScore}/5`} eyebrow="Release readiness">
          <div style={{ color: '#64748b' }}>This is the fast smell test before someone tries to publish half-baked curriculum.</div>
        </Card>
        <Card title={activeModule?.title ?? 'Unmapped'} eyebrow="Current module">
          <div style={{ color: '#64748b' }}>{activeModule ? `${activeModuleSubjectName} • ${activeModule.level} • ${activeModule.status}` : failedSources.length ? 'Module context is temporarily unavailable because the supporting feed failed.' : 'This lesson is not mapped to a known module right now.'}</div>
        </Card>
        <Card title={String(relatedAssessments.length)} eyebrow="Assessment gates">
          <div style={{ color: '#64748b' }}>{relatedAssessments.length ? 'Progression checks linked to this module are visible below.' : assessmentsResult.status === 'rejected' ? 'Assessment gate data is temporarily unavailable.' : 'No module gate exists yet. That needs fixing before this lane acts release-safe.'}</div>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 20, marginBottom: 20 }}>
        {editorDependenciesReady ? (
          <LessonEditorForm lesson={lesson} subjects={subjects} modules={modules} action={updateLessonAction} returnPath={returnPath} />
        ) : (
          <Card title="Editor temporarily unavailable" eyebrow="Missing dependencies">
            {sectionAlert(
              failedSources.length
                ? 'The lesson editor is paused until subjects, modules, and lesson baselines load again. Better a visible warning than a dead route.'
                : 'Editing needs subjects, modules, and lesson baselines before the form can render.',
              'warning'
            )}
          </Card>
        )}

        <div style={{ ...responsiveGrid(300), alignItems: 'start' }}>
          <Card title="Authoring checkpoints" eyebrow="Publish discipline">
            <div style={{ display: 'grid', gap: 12 }}>
              {readinessChecks.map(([label, passed]) => (
                <div key={label} style={{ padding: 14, borderRadius: 16, background: passed ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${passed ? '#BBF7D0' : '#FECACA'}` }}>
                  <strong style={{ color: passed ? '#166534' : '#991B1B' }}>{passed ? 'Ready' : 'Blocked'}</strong>
                  <div style={{ color: '#475569', marginTop: 6, lineHeight: 1.6 }}>{label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Assessment wiring" eyebrow="This lesson's module gates">
            <div style={{ display: 'grid', gap: 12 }}>
              {relatedAssessments.length ? relatedAssessments.map((assessment) => (
                <div key={assessment.id} style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                    <strong>{assessment.title}</strong>
                    <Pill label={assessment.status} tone={statusTone(assessment.status).tone} text={statusTone(assessment.status).text} />
                  </div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>{assessment.triggerLabel || assessment.trigger} • Pass score {Math.round(assessment.passingScore * 100)}%</div>
                </div>
              )) : (
                sectionAlert(
                  assessmentsResult.status === 'rejected'
                    ? 'Assessment gate wiring is unavailable because the assessment feed failed.'
                    : 'No assessment gate linked to this module. That’s not a real release path; it’s wishful thinking.',
                  assessmentsResult.status === 'rejected' ? 'warning' : 'neutral'
                )
              )}
            </div>
          </Card>

          <Card title="Sibling lesson packs" eyebrow="Same module context">
            <div style={{ display: 'grid', gap: 10 }}>
              {siblingLessons.length ? siblingLessons.slice(0, 6).map((sibling) => (
                <div key={sibling.id} style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <strong>{sibling.title}</strong>
                    <Pill label={sibling.status} tone={statusTone(sibling.status).tone} text={statusTone(sibling.status).text} />
                  </div>
                  <div style={{ color: '#64748b', marginBottom: 8 }}>{sibling.durationMinutes} min • {sibling.mode}</div>
                  <Link href={`/content/lessons/${sibling.id}?from=${encodeURIComponent(returnPath)}`} style={{ color: '#4F46E5', fontWeight: 700, textDecoration: 'none' }}>
                    Open sibling pack →
                  </Link>
                </div>
              )) : (
                sectionAlert(
                  lessonsResult.status === 'rejected'
                    ? 'Sibling lesson packs are unavailable because the lesson feed failed.'
                    : 'No sibling packs found in this module yet.',
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
