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

export default async function LessonDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string; message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const returnPath = query?.from || '/content';

  let lesson;
  try {
    lesson = await fetchLesson(id);
  } catch {
    notFound();
  }

  const [subjects, modules, lessons, assessments] = await Promise.all([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchAssessments(),
  ]);

  const activeModule = modules.find((module) => module.id === lesson.moduleId || module.title === lesson.moduleTitle) ?? null;
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

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title={`${readinessScore}/5`} eyebrow="Release readiness">
          <div style={{ color: '#64748b' }}>This is the fast smell test before someone tries to publish half-baked curriculum.</div>
        </Card>
        <Card title={activeModule?.title ?? 'Unmapped'} eyebrow="Current module">
          <div style={{ color: '#64748b' }}>{activeModule ? `${activeModule.subjectName} • ${activeModule.level} • ${activeModule.status}` : 'This lesson is not mapped to a known module right now.'}</div>
        </Card>
        <Card title={String(relatedAssessments.length)} eyebrow="Assessment gates">
          <div style={{ color: '#64748b' }}>{relatedAssessments.length ? 'Progression checks linked to this module are visible below.' : 'No module gate exists yet. That needs fixing before this lane acts release-safe.'}</div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 16, marginBottom: 20 }}>
        <LessonEditorForm lesson={lesson} subjects={subjects} modules={modules} action={updateLessonAction} returnPath={returnPath} />

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
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
                <div style={{ padding: 14, borderRadius: 16, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', fontWeight: 700 }}>
                  No assessment gate linked to this module. That’s not a real release path; it’s wishful thinking.
                </div>
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
                <div style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748b' }}>
                  No sibling packs found in this module yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
