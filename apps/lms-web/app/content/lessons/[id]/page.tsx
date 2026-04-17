import Link from 'next/link';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { LessonEditorForm } from '../../../../components/lesson-editor-form';
import { fetchAssessments, fetchCurriculumModules, fetchLesson, fetchSubjects } from '../../../../lib/api';
import { PageShell } from '../../../../lib/ui';
import { updateLessonAction } from '../../../actions';

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

const cardStyle = {
  padding: 20,
  borderRadius: 24,
  background: 'white',
  border: '1px solid #e5e7eb',
  boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
} as const;

export default async function LessonStudioEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ message?: string; from?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const from = normalizeParam(query?.from) || '/content';

  const [lesson, modules, subjects, assessments] = await Promise.all([
    fetchLesson(id),
    fetchCurriculumModules(),
    fetchSubjects(),
    fetchAssessments(),
  ]);

  const selectedModule = modules.find((module) => module.id === lesson.moduleId) ?? modules[0] ?? null;
  const selectedSubject = subjects.find((subject) => subject.id === (lesson.subjectId ?? selectedModule?.subjectId)) ?? subjects[0] ?? null;
  const moduleAssessments = assessments.filter((assessment) => assessment.moduleId === selectedModule?.id);
  const linkedAssessmentTitle = typeof lesson.lessonAssessment?.title === 'string' ? lesson.lessonAssessment.title : null;
  const linkedAssessment = linkedAssessmentTitle
    ? moduleAssessments.find((assessment) => assessment.title === linkedAssessmentTitle) ?? null
    : null;

  return (
    <PageShell
      title="Lesson Editor"
      subtitle="Edit the full lesson authoring payload without nuking objectives, localization, assessment items, or activity steps on save."
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Content Library', href: '/content' },
      ]}
      aside={(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={from} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>
            Back to board
          </Link>
          <Link href={`/content/lessons/new?duplicate=${encodeURIComponent(lesson.id)}&subjectId=${encodeURIComponent(lesson.subjectId ?? selectedSubject?.id ?? '')}&moduleId=${encodeURIComponent(lesson.moduleId ?? selectedModule?.id ?? '')}&from=${encodeURIComponent(from)}`} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Duplicate lesson
          </Link>
        </div>
      )}
    >
      <FeedbackBanner message={query?.message} />

      <section style={{ display: 'grid', gap: 18 }}>
        <LessonEditorForm
          lesson={lesson}
          subjects={subjects}
          modules={modules}
          action={updateLessonAction}
          returnPath={from}
        />

        <aside style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 8 }}>Current context</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div><strong style={{ color: '#0f172a' }}>Subject:</strong> <span style={{ color: '#475569' }}>{selectedSubject?.name ?? lesson.subjectName ?? '—'}</span></div>
              <div><strong style={{ color: '#0f172a' }}>Module:</strong> <span style={{ color: '#475569' }}>{selectedModule?.title ?? lesson.moduleTitle ?? '—'}</span></div>
              <div><strong style={{ color: '#0f172a' }}>Assessment link:</strong> <span style={{ color: '#475569' }}>{linkedAssessmentTitle ?? 'None linked yet'}</span></div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 8 }}>Gate sanity check</div>
            {linkedAssessment ? (
              <div style={{ color: '#475569', lineHeight: 1.7 }}>
                This lesson is currently pointing at <strong style={{ color: '#0f172a' }}>{linkedAssessment.title}</strong>. Edit the real lesson pack here instead of spinning up another fake fix.
              </div>
            ) : (
              <div style={{ color: '#92400E', lineHeight: 1.7 }}>
                No visible module gate is linked to this lesson yet. That is survivable, but it is also how release mess quietly starts.
              </div>
            )}
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <Link href={`/assessments?subject=${encodeURIComponent(selectedSubject?.id ?? '')}&q=${encodeURIComponent(selectedModule?.title ?? lesson.title)}`} style={{ color: '#5B21B6', fontWeight: 800, textDecoration: 'none' }}>
                Open assessment board →
              </Link>
              <Link href={`/content?view=blocked&subject=${encodeURIComponent(selectedSubject?.id ?? '')}&q=${encodeURIComponent(selectedModule?.title ?? lesson.title)}`} style={{ color: '#92400E', fontWeight: 800, textDecoration: 'none' }}>
                Review blocker context →
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
