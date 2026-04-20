import Link from 'next/link';
import { DeploymentBlockerCard } from '../../../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { LessonEditorForm } from '../../../../components/lesson-editor-form';
import { fetchAssessments, fetchCurriculumModules, fetchLesson, fetchLessonAssets, fetchLessons, fetchSubjects } from '../../../../lib/api';
import { normalizeLessonForAuthoring } from '../../../../lib/lesson-authoring-normalize';
import { sanitizeInternalReturnPath } from '../../../../lib/safe-return-path';
import type { CurriculumModule, Subject } from '../../../../lib/types';
import { PageShell } from '../../../../lib/ui';
import { updateLessonAction } from '../../../actions';

const cardStyle = {
  padding: 20,
  borderRadius: 24,
  background: 'white',
  border: '1px solid #e5e7eb',
  boxShadow: '0 12px 30px rgba(15,23,42,0.06)',
} as const;

function buildFallbackSubject(subjects: Subject[], lesson: { subjectId?: string | null; subjectName?: string | null }) {
  const subjectId = lesson.subjectId?.trim();
  const subjectName = lesson.subjectName?.trim();
  const matched = subjects.find((subject) => subject.id === subjectId || (subjectName && subject.name === subjectName));

  if (matched) return matched;
  if (!subjectId && !subjectName) return null;

  return {
    id: subjectId ?? '__lesson-subject',
    name: subjectName ?? 'Current subject',
  } satisfies Subject;
}

function buildFallbackModule(modules: CurriculumModule[], lesson: { moduleId?: string | null; moduleTitle?: string | null; subjectId?: string | null; subjectName?: string | null }) {
  const moduleId = lesson.moduleId?.trim();
  const moduleTitle = lesson.moduleTitle?.trim();
  const matched = modules.find((module) => module.id === moduleId || (moduleTitle && module.title === moduleTitle));

  if (matched) return matched;
  if (!moduleId && !moduleTitle) return null;

  return {
    id: moduleId ?? '__lesson-module',
    title: moduleTitle ?? 'Current module',
    subjectId: lesson.subjectId?.trim() || null,
    subjectName: lesson.subjectName?.trim() ?? 'Current subject',
    level: 'Current lane',
    lessonCount: 1,
    status: 'unknown',
    strandName: 'Current strand',
  } satisfies CurriculumModule;
}

export default async function LessonStudioEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ message?: string; from?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const from = sanitizeInternalReturnPath(query?.from, '/content');

  const [lessonResult, lessonsResult, modulesResult, subjectsResult, assessmentsResult, assetsResult] = await Promise.allSettled([
    fetchLesson(id),
    fetchLessons(),
    fetchCurriculumModules(),
    fetchSubjects(),
    fetchAssessments(),
    fetchLessonAssets(),
  ]);

  const fallbackInventoryLesson = lessonsResult.status === 'fulfilled'
    ? lessonsResult.value.find((entry) => entry.id === id) ?? null
    : null;
  const rawLesson = lessonResult.status === 'fulfilled' ? lessonResult.value : fallbackInventoryLesson;
  const { lesson, issues: lessonPayloadIssues } = normalizeLessonForAuthoring(rawLesson);
  const lessonFeedRecoveredFromInventory = lessonResult.status === 'rejected' && Boolean(fallbackInventoryLesson);

  const failedSources = [
    lessonResult.status === 'rejected' && !fallbackInventoryLesson ? 'lesson' : null,
    lessonFeedRecoveredFromInventory ? 'lesson (direct feed degraded, inventory fallback used)' : null,
    lessonPayloadIssues.length ? 'lesson payload' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    assetsResult.status === 'rejected' ? 'assets' : null,
  ].filter(Boolean) as string[];
  const loadedModules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const loadedSubjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const assets = assetsResult.status === 'fulfilled' ? assetsResult.value : [];

  const fallbackSubject = lesson ? buildFallbackSubject(loadedSubjects, lesson) : null;
  const fallbackModule = lesson ? buildFallbackModule(loadedModules, lesson) : null;
  const subjects = fallbackSubject && !loadedSubjects.some((subject) => subject.id === fallbackSubject.id)
    ? [...loadedSubjects, fallbackSubject]
    : loadedSubjects;
  const modules = fallbackModule && !loadedModules.some((module) => module.id === fallbackModule.id)
    ? [...loadedModules, fallbackModule]
    : loadedModules;
  const hasUsableCurriculumContext = Boolean(lesson && (subjects.length > 0 || fallbackSubject) && (modules.length > 0 || fallbackModule));

  if (!lesson || !hasUsableCurriculumContext) {
    return (
      <DeploymentBlockerCard
        title="Lesson Editor"
        subtitle="Critical editor feeds are degraded, so lesson editing is blocked instead of crashing into a server error page."
        blockerHeadline="Deployment blocker: lesson editor context could not be recovered."
        blockerDetail={(
          <>
            The editor cannot safely load this lesson because the minimum authoring context is still incomplete or the lesson payload is malformed. Failed feed{failedSources.length === 1 ? '' : 's'}: {failedSources.join(', ') || 'unknown'}. {lessonPayloadIssues.length ? `Payload issues: ${lessonPayloadIssues.join(' ')}` : ''}
          </>
        )}
        whyBlocked={[
          'Editing stays available when the lesson payload and enough curriculum context can be recovered. That recovery failed here.',
          'The exact blocker is not “the whole LMS is broken”; it is that this lesson cannot be attached to a real lesson record plus module/subject context right now.',
          'Blocking loudly here is still safer than rendering a broken editor shell that saves against a ghost lesson or an orphan module.',
        ]}
        verificationItems={[
          {
            surface: 'Lesson payload',
            expected: 'The requested lesson record loads successfully with an authorable id/title plus sane activity + assessment collections',
            failure: 'The lesson feed is down, the record is missing core identity, or malformed nested rows poison the editor form',
          },
          {
            surface: 'Curriculum context',
            expected: 'At least one usable subject and module context is available, either from live feeds or from the lesson record itself',
            failure: 'The editor cannot determine where this lesson belongs',
          },
          {
            surface: 'Optional metadata feeds',
            expected: 'Assessment and asset panels can degrade without blocking editing',
            failure: 'Optional feed loss incorrectly blocks the whole editor',
          },
        ]}
        fixItems={[
          { label: 'Failing feeds', value: failedSources.join(', ') || 'unknown' },
          { label: 'Must be restored', value: !lesson ? 'Lesson payload integrity' : 'Lesson subject/module context' },
          { label: 'Still optional', value: assessmentsResult.status === 'rejected' || assetsResult.status === 'rejected' ? 'Assessment and asset side panels' : 'Assessment and asset side panels are healthy' },
        ]}
        docs={[
          { label: 'Content board', href: '/content', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Assessments', href: '/assessments', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
        ]}
      />
    );
  }

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
          <Link href={`/content/assets?subjectId=${encodeURIComponent(lesson.subjectId ?? selectedSubject?.id ?? '')}&moduleId=${encodeURIComponent(lesson.moduleId ?? selectedModule?.id ?? '')}&lessonId=${encodeURIComponent(lesson.id)}&from=${encodeURIComponent(`/content/lessons/${lesson.id}?from=${encodeURIComponent(from)}`)}`} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' }}>
            Browse assets
          </Link>
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

      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Editor recovered with degraded feeds: {failedSources.join(', ')}. Lesson editing stays live because the lesson payload and curriculum context are still usable.{lessonPayloadIssues.length ? ` Sanitized payload issues: ${lessonPayloadIssues.join(' ')}` : ''}
        </div>
      ) : null}

      <section style={{ display: 'grid', gap: 18 }}>
        <LessonEditorForm
          lesson={lesson}
          subjects={subjects}
          modules={modules}
          assets={assets}
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
