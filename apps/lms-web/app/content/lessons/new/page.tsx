import Link from 'next/link';
import { DeploymentBlockerCard } from '../../../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { LessonCreateForm } from '../../../../components/lesson-create-form';
import { fetchCurriculumModules, fetchLessonAssets, fetchLessons, fetchSubjects } from '../../../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../../../lib/config';
import { PageShell } from '../../../../lib/ui';
import { createLessonAction } from '../../../actions';

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

export default async function LessonStudioCreatePage({
  searchParams,
}: {
  searchParams?: Promise<{
    message?: string;
    from?: string | string[];
    subjectId?: string | string[];
    moduleId?: string | string[];
    duplicate?: string | string[];
    createdLessonId?: string | string[];
    createdLessonTitle?: string | string[];
  }>;
}) {
  const query = await searchParams;

  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Lesson Studio"
        subtitle="Production wiring is incomplete, so lesson authoring is blocked instead of crashing behind a broken API dependency."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: lesson studio API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is present, but the current value is not production-safe. {API_BASE_DIAGNOSTIC.blockerDetail} Treating that as healthy would make lesson authoring look live while it is pointed at a dead or unsafe backend.
          </>
        )}
        whyBlocked={[
          'Lesson Studio depends on live subject, module, and lesson inventory data. Without a valid production API base, this route can only lie or crash.',
          'Content authors should see one honest blocker state, not a Next.js error page that looks like random breakage.',
          'Blocking here keeps deployment review consistent with the rest of the LMS surfaces already enforcing the production API guard.',
        ]}
        verificationItems={[
          {
            surface: 'Lesson create route',
            expected: 'Loads subject/module inventory or shows the blocker card before any fetch explodes',
            failure: 'Server error or broken form shell when production API env is missing or invalid',
          },
          {
            surface: 'Duplicate lesson flow',
            expected: 'Existing lessons load for duplication when the API is healthy',
            failure: 'Empty duplicate source or route crash while the deployment pretends authoring is available',
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
          { label: 'Canvas blocker', href: '/canvas', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
        ]}
      />
    );
  }

  const [subjectsResult, modulesResult, lessonsResult, assetsResult] = await Promise.allSettled([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchLessonAssets(),
  ]);

  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const assets = assetsResult.status === 'fulfilled' ? assetsResult.value : [];
  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assetsResult.status === 'rejected' ? 'assets' : null,
  ].filter(Boolean) as string[];
  const missingCoreAuthoringFeeds = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
  ].filter(Boolean) as string[];

  if (missingCoreAuthoringFeeds.length) {
    return (
      <DeploymentBlockerCard
        title="Lesson Studio"
        subtitle="Critical authoring feeds are degraded, so lesson creation is blocked instead of crashing into a Next.js error page."
        blockerHeadline="Deployment blocker: lesson authoring dependencies are down."
        blockerDetail={(
          <>
            Lesson Studio cannot safely create a lesson when the core curriculum feeds are missing. Failed feed{failedSources.length === 1 ? '' : 's'}: {failedSources.join(', ')}.
          </>
        )}
        whyBlocked={[
          'Creating a lesson without live subject and module inventory risks producing an orphaned or mis-scoped lesson record.',
          'A server error page on a core admin authoring route is a deployment blocker, not a tolerable degraded state.',
          'Blocking loudly here keeps content operations honest while the upstream feed failure is fixed.',
        ]}
        verificationItems={[
          {
            surface: 'Lesson create route',
            expected: 'Loads subject and module inventory or shows this blocker card when those feeds are down',
            failure: 'Next.js error page or a form that pretends authoring is available without curriculum context',
          },
          {
            surface: 'Duplicate lesson picker',
            expected: 'Existing lessons load when the lessons feed is healthy, but the route still boots without it',
            failure: 'The whole route crashes because an optional duplicate source feed failed',
          },
          {
            surface: 'Return path after recovery',
            expected: 'Operators can create a lesson and hand straight into the editor once feeds recover',
            failure: 'Authoring stays blocked after subjects/modules recover',
          },
        ]}
        fixItems={[
          { label: 'Failing feeds', value: missingCoreAuthoringFeeds.join(', ') },
          { label: 'Operator action', value: 'Restore subject/module inventory before using Lesson Studio' },
          { label: 'Optional feed', value: lessonsResult.status === 'rejected' ? 'Duplicate lesson source list is currently unavailable' : 'Duplicate lesson source list is healthy' },
        ]}
        docs={[
          { label: 'Content board', href: '/content', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Curriculum canvas', href: '/canvas', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
        ]}
      />
    );
  }

  const from = normalizeParam(query?.from) || '/content';
  const subjectId = normalizeParam(query?.subjectId) || subjects[0]?.id || '';
  const moduleId = normalizeParam(query?.moduleId) || modules.find((module) => module.subjectId === subjectId)?.id || modules[0]?.id || '';
  const duplicateLessonId = normalizeParam(query?.duplicate);
  const createdLessonId = normalizeParam(query?.createdLessonId);
  const createdLessonTitle = normalizeParam(query?.createdLessonTitle);

  const selectedModule = modules.find((module) => module.id === moduleId) ?? modules[0] ?? null;
  const selectedSubject = subjects.find((subject) => subject.id === subjectId) ?? subjects.find((subject) => subject.id === selectedModule?.subjectId) ?? subjects[0] ?? null;

  return (
    <PageShell
      title="Lesson Studio"
      subtitle="Create a full lesson pack with the real authoring payload intact instead of shipping a pretty little data shredder."
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Content Library', href: '/content' },
      ]}
      aside={(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={`/content/assets?subjectId=${encodeURIComponent(selectedSubject?.id ?? '')}&moduleId=${encodeURIComponent(selectedModule?.id ?? '')}`} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' }}>
            Browse assets
          </Link>
          <Link href={from} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>
            Back to board
          </Link>
          <Link href="/canvas" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Open canvas
          </Link>
        </div>
      )}
    >
      <FeedbackBanner message={query?.message} />

      {createdLessonId ? (
        <section style={{ ...cardStyle, marginBottom: 18, background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)', border: '1px solid #c7d2fe' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#6366f1', fontWeight: 900 }}>Lesson created</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1e1b4b' }}>{createdLessonTitle || 'New lesson saved'}</div>
            <div style={{ color: '#4338ca', lineHeight: 1.7 }}>
              The create flow now hands straight into the real editor with objectives, localization, assessment, and activity spine preserved.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href={`/content/lessons/${createdLessonId}?from=${encodeURIComponent(from)}`} style={{ borderRadius: 12, padding: '11px 14px', textDecoration: 'none', fontWeight: 800, background: '#4F46E5', color: '#ffffff' }}>
                Open lesson editor
              </Link>
              <Link href={from} style={{ borderRadius: 12, padding: '11px 14px', textDecoration: 'none', fontWeight: 800, background: '#ffffff', color: '#0f172a', border: '1px solid #dbe4ee' }}>
                Return to previous board
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section style={{ display: 'grid', gap: 18 }}>
        <LessonCreateForm
          subjects={subjects}
          modules={modules}
          lessons={lessons}
          assets={assets}
          action={createLessonAction}
          initialSubjectId={selectedSubject?.id ?? subjectId}
          initialModuleId={selectedModule?.id ?? moduleId}
          duplicateLessonId={duplicateLessonId || undefined}
          returnPath={from}
        />

        <aside style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 8 }}>Launch context</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div><strong style={{ color: '#0f172a' }}>Subject:</strong> <span style={{ color: '#475569' }}>{selectedSubject?.name ?? '—'}</span></div>
              <div><strong style={{ color: '#0f172a' }}>Module:</strong> <span style={{ color: '#475569' }}>{selectedModule?.title ?? '—'}</span></div>
              <div><strong style={{ color: '#0f172a' }}>Duplicate source:</strong> <span style={{ color: '#475569' }}>{duplicateLessonId ? (lessons.find((lesson) => lesson.id === duplicateLessonId)?.title ?? duplicateLessonId) : 'Fresh lesson pack'}</span></div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 8 }}>Operator moves</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <Link href={from} style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>Return to previous board →</Link>
              <Link href={`/content?subject=${encodeURIComponent(selectedSubject?.id ?? '')}&q=${encodeURIComponent(selectedModule?.title ?? '')}`} style={{ color: '#166534', fontWeight: 800, textDecoration: 'none' }}>Open related module lane →</Link>
              <Link href="/content?view=blocked" style={{ color: '#92400E', fontWeight: 800, textDecoration: 'none' }}>Review blocker stack →</Link>
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
