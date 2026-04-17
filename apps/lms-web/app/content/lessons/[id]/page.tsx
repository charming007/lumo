import Link from 'next/link';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { fetchAssessments, fetchCurriculumModules, fetchLesson, fetchSubjects } from '../../../../lib/api';
import { PageShell, Pill } from '../../../../lib/ui';
import { updateLessonAction } from '../../../actions';

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  background: 'white',
} as const;

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
      subtitle="A real lesson editor route for the LMS. The canvas can now open a lesson directly instead of sending operators into the void."
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

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)', gap: 18 }}>
        <form action={updateLessonAction} style={{ ...cardStyle, display: 'grid', gap: 16 }}>
          <input type="hidden" name="lessonId" value={lesson.id} />
          <input type="hidden" name="returnPath" value={from} />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>Inline authoring</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>{lesson.title}</div>
              <div style={{ color: '#475569', lineHeight: 1.7 }}>
                Edit the exact lesson the canvas selected. No more dead link, no more context loss, no more guessing which pack somebody meant.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={lesson.status} tone="#EEF2FF" text="#3730A3" />
              <Pill label={`${lesson.durationMinutes} min`} tone="#ECFDF5" text="#166534" />
              <Pill label={lesson.mode} tone="#F5F3FF" text="#6D28D9" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Subject
              <select name="subjectId" defaultValue={lesson.subjectId ?? selectedSubject?.id ?? ''} style={inputStyle}>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Module
              <select name="moduleId" defaultValue={lesson.moduleId ?? selectedModule?.id ?? ''} style={inputStyle}>
                {modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
              </select>
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
            Lesson title
            <input name="title" defaultValue={lesson.title} maxLength={120} style={inputStyle} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Sequence slot
              <input name="order" type="number" min="1" max="60" defaultValue={lesson.order ?? ''} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Duration (min)
              <input name="durationMinutes" type="number" min="1" max="240" defaultValue={lesson.durationMinutes} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Mode
              <select name="mode" defaultValue={lesson.mode} style={inputStyle}>
                <option value="guided">Guided</option>
                <option value="group">Group</option>
                <option value="independent">Independent</option>
                <option value="practice">Practice</option>
                <option value="ops">Ops</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#475569' }}>
              Status
              <select name="status" defaultValue={lesson.status} style={inputStyle}>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <button type="submit" style={{ border: 0, borderRadius: 14, padding: '13px 16px', fontWeight: 800, background: '#4F46E5', color: '#ffffff', cursor: 'pointer' }}>
            Save lesson changes
          </button>
        </form>

        <aside style={{ display: 'grid', gap: 16 }}>
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
                This lesson is currently pointing at <strong style={{ color: '#0f172a' }}>{linkedAssessment.title}</strong>. If the lesson is wrong, fix the lesson here instead of spawning another stray gate.
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
