import Link from 'next/link';
import { DeploymentBlockerCard } from '../../../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { LessonEditorForm } from '../../../../components/lesson-editor-form';
import { fetchAssessments, fetchCurriculumModules, fetchLesson, fetchSubjects } from '../../../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../../../lib/config';
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

  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Lesson Editor"
        subtitle="Production wiring is incomplete, so lesson editing is blocked instead of pretending a live lesson pack can be loaded."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: lesson editor API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            {API_BASE_DIAGNOSTIC.source === 'missing-production-env'
              ? (
                <>
                  This build does not have <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code>, so the lesson editor cannot safely load the lesson, module context, or assessment links. Blocking here is better than throwing operators into a broken editor route.
                </>
              )
              : (
                <>
                  <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is present, but the current value is not production-safe. {API_BASE_DIAGNOSTIC.blockerDetail} Treating that as healthy would make lesson editing look available while the route is pointed at a dead or unsafe backend.
                </>
              )}
          </>
        )}
        whyBlocked={[
          'Lesson editing depends on live lesson payloads, subject/module context, and assessment links. If the API base is wrong, this route should stop loudly instead of crashing mid-load.',
          'Operators use this route for real curriculum fixes. A broken editor is a deployment blocker, not a cosmetic bug.',
          'This keeps lesson routes aligned with the rest of the LMS production blocker behavior instead of leaving a hidden hole in content ops.',
        ]}
        verificationItems={[
          {
            surface: 'Lesson edit route',
            expected: 'Loads the live lesson payload or shows the blocker card before any fetch explodes',
            failure: 'Server error page when production API env is missing or invalid',
          },
          {
            surface: 'Assessment context panel',
            expected: 'Shows the linked gate only when lesson + module data load from the API',
            failure: 'Editor shell breaks before operators can even see why the route is unavailable',
          },
          {
            surface: 'Configured API base URL',
            expected: `Uses a real HTTPS production host such as ${API_BASE_DIAGNOSTIC.expectedFormat}`,
            failure: `Placeholder, localhost, invalid, or non-HTTPS value${API_BASE_DIAGNOSTIC.configuredApiBase ? ` like ${API_BASE_DIAGNOSTIC.configuredApiBase}` : ''}`,
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Content blocker', href: '/content', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Assessments blocker', href: '/assessments', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
        ]}
      />
    );
  }

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
