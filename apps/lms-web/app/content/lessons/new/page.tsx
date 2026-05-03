import Link from 'next/link';
import { DeploymentBlockerCard } from '../../../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../../../components/feedback-banner';
import { LessonCreateForm } from '../../../../components/lesson-create-form';
import { fetchCurriculumModules, fetchLessonAssets, fetchLessons, fetchSubjects } from '../../../../lib/api';
import {
  normalizeLessonAssetsForAuthoring,
  normalizeLessonsForAuthoring,
  normalizeModulesForAuthoring,
  normalizeSubjectsForAuthoring,
} from '../../../../lib/lesson-authoring-normalize';
import { buildReviewBlockersHref } from '../../../../lib/content-return-path';
import { resolveLessonStudioLaunchContext } from '../../../../lib/lesson-studio-launch-context';
import { normalizeRouteParam, sanitizeInternalReturnPath } from '../../../../lib/safe-return-path';
import type { Subject } from '../../../../lib/types';
import { PageShell } from '../../../../lib/ui';
import { createLessonAction } from '../../../actions';

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

  const [subjectsResult, modulesResult, lessonsResult, assetsResult] = await Promise.allSettled([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchLessonAssets(),
  ]);

  const { items: loadedSubjects, issues: subjectPayloadIssues } = normalizeSubjectsForAuthoring(subjectsResult.status === 'fulfilled' ? subjectsResult.value : []);
  const { items: modules, issues: modulePayloadIssues } = normalizeModulesForAuthoring(modulesResult.status === 'fulfilled' ? modulesResult.value : []);
  const { items: lessons, issues: lessonPayloadIssues } = normalizeLessonsForAuthoring(lessonsResult.status === 'fulfilled' ? lessonsResult.value : []);
  const { assets, issues: assetPayloadIssues } = normalizeLessonAssetsForAuthoring(assetsResult.status === 'fulfilled' ? assetsResult.value : []);
  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assetsResult.status === 'rejected' ? 'assets' : null,
    subjectPayloadIssues.length ? 'subject payload' : null,
    modulePayloadIssues.length ? 'module payload' : null,
    lessonPayloadIssues.length ? 'lesson payload' : null,
    assetPayloadIssues.length ? 'asset payload' : null,
  ].filter(Boolean) as string[];

  const derivedSubjectKeys = new Set<string>();
  const derivedSubjects = modules.reduce<Subject[]>((acc, module) => {
    const subjectId = module.subjectId?.trim();
    const subjectName = module.subjectName?.trim();
    if (!subjectId && !subjectName) return acc;

    const derived = {
      id: subjectId ?? `derived-${subjectName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? acc.length + 1}`,
      name: subjectName ?? 'Recovered subject',
    } satisfies Subject;

    const normalizedId = derived.id.trim().toLowerCase();
    const normalizedName = derived.name.trim().toLowerCase();
    const duplicateKeys = [normalizedId, normalizedName].filter(Boolean);

    if (duplicateKeys.some((key) => derivedSubjectKeys.has(key))) {
      return acc;
    }

    duplicateKeys.forEach((key) => derivedSubjectKeys.add(key));
    acc.push(derived);
    return acc;
  }, []);

  const subjects = loadedSubjects.length
    ? loadedSubjects
    : derivedSubjects;
  const hasUsableAuthoringContext = modules.length > 0 && subjects.length > 0;

  if (!hasUsableAuthoringContext) {
    return (
      <DeploymentBlockerCard
        title="Lesson Studio"
        subtitle="Critical authoring feeds are degraded, so lesson creation is blocked instead of crashing into a Next.js error page."
        blockerHeadline="Deployment blocker: lesson authoring context could not be recovered."
        blockerDetail={(
          <>
            Lesson Studio cannot safely create a lesson because it still lacks a usable module + subject authoring context. Failed feed{failedSources.length === 1 ? '' : 's'}: {failedSources.join(', ') || 'unknown'}.
          </>
        )}
        whyBlocked={[
          'Lesson creation should stay live when module inventory still gives us a trustworthy curriculum lane, even if the dedicated subjects feed hiccups. That recovery was not possible here.',
          'The exact blocker is the missing authoring context, not a vague “deployment is bad” scare card.',
          'Blocking here is still correct when Lesson Studio would otherwise create an orphan lesson with no real module attachment.',
        ]}
        verificationItems={[
          {
            surface: 'Module inventory',
            expected: 'At least one real module loads for authoring',
            failure: 'The create route cannot attach a new lesson to a curriculum lane',
          },
          {
            surface: 'Subject context',
            expected: 'Subjects load directly or can be reconstructed from the module feed',
            failure: 'The route has no trustworthy subject scope for the new lesson',
          },
          {
            surface: 'Optional feeds',
            expected: 'Duplicate source lessons and asset panels can degrade without blocking draft creation',
            failure: 'Optional feed loss incorrectly blocks the full authoring route',
          },
        ]}
        fixItems={[
          { label: 'Failing feeds', value: failedSources.join(', ') || 'unknown' },
          { label: 'Must be restored', value: modules.length === 0 ? 'Module inventory' : 'Subject context for loaded modules' },
          { label: 'Still optional', value: lessonsResult.status === 'rejected' ? 'Duplicate lesson source list is currently unavailable' : 'Duplicate lesson source list is healthy' },
        ]}
        docs={[
          { label: 'Content board', href: '/content', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Blocked modules', href: '/content?view=blocked', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
        ]}
      />
    );
  }

  const from = sanitizeInternalReturnPath(query?.from, '/content');
  const requestedSubjectId = normalizeRouteParam(query?.subjectId);
  const requestedModuleId = normalizeRouteParam(query?.moduleId);
  const duplicateLessonId = normalizeRouteParam(query?.duplicate);
  const createdLessonId = normalizeRouteParam(query?.createdLessonId);
  const createdLessonTitle = normalizeRouteParam(query?.createdLessonTitle);

  const {
    requestedModule,
    selectedSubject,
    selectedModule,
    resolvedSubjectId,
    resolvedModuleId,
    requestedModuleRecoveredSubject,
    requestedModuleHasRecoverableSubject,
    subjectRecoveredFromModule,
  } = resolveLessonStudioLaunchContext(subjects, modules, {
    requestedSubjectId,
    requestedModuleId,
  });
  const requestedModuleSubjectId = requestedModule?.subjectId?.trim() ?? '';

  if (requestedModule && !requestedModuleHasRecoverableSubject) {
    return (
      <DeploymentBlockerCard
        title="Lesson Studio"
        subtitle="Lesson creation stays blocked when the requested module does not have a recoverable subject context."
        blockerHeadline="Deployment blocker: requested lesson lane cannot be trusted."
        blockerDetail={(
          <>
            The requested module <code style={{ color: 'white', fontWeight: 900 }}>{requestedModule.title}</code> does not have a recoverable subject mapping, so Lesson Studio refused to silently reroute this authoring session into a different curriculum lane.
          </>
        )}
        whyBlocked={[
          'Silently falling back to the first valid subject/module would let operators think they are fixing one blocked module while actually creating content somewhere else.',
          'This is a release-safety problem, not a cosmetic empty state. Wrong-lane authoring is data corruption with nicer typography.',
          'The fix is to recover the module subject context first, then reopen Lesson Studio from the blocker board.',
        ]}
        verificationItems={[
          {
            surface: 'Requested module',
            expected: 'Has a real subjectId that resolves to a loaded subject lane',
            failure: 'Lesson Studio would otherwise attach the draft to an unrelated fallback subject or module',
          },
          {
            surface: 'Lesson create launch context',
            expected: 'subjectId and moduleId agree on the same curriculum lane',
            failure: 'Lesson Studio opens, but the selected lane no longer matches the blocker row that launched it',
          },
        ]}
        fixItems={[
          { label: 'Blocked module', value: requestedModule.title },
          { label: 'Missing context', value: requestedModuleSubjectId ? `Subject ${requestedModuleSubjectId} is not available in authoring context` : requestedModule.subjectName?.trim() ? `No loaded subject matches module subject name “${requestedModule.subjectName.trim()}”` : 'Module subjectId and subjectName are both missing' },
          { label: 'Operator action', value: 'Recover subject context on the content blockers board before creating the lesson pack' },
        ]}
        docs={[
          { label: 'Back to blocker board', href: from, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Content library', href: '/content?view=blocked', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
        ]}
      />
    );
  }

  const subjectId = resolvedSubjectId;
  const moduleId = resolvedModuleId;
  const reviewBlockersHref = buildReviewBlockersHref(from);
  const lessonCreateFormKey = [
    subjectId,
    moduleId,
    duplicateLessonId ?? '',
    from,
    selectedSubject?.id ?? '',
    selectedModule?.id ?? '',
  ].join('::');

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
          <Link href={`/content/assets?subjectId=${encodeURIComponent(selectedSubject?.id ?? '')}&moduleId=${encodeURIComponent(selectedModule?.id ?? '')}&from=${encodeURIComponent(`/content/lessons/new?subjectId=${selectedSubject?.id ?? subjectId}&moduleId=${selectedModule?.id ?? moduleId}&from=${encodeURIComponent(from)}`)}`} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' }}>
            Browse assets
          </Link>
          <Link href={from} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>
            Back to board
          </Link>
          <Link href={reviewBlockersHref} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>
            Review blockers
          </Link>
        </div>
      )}
    >
      <FeedbackBanner message={query?.message} />

      {failedSources.length || subjectRecoveredFromModule ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          {failedSources.length
            ? `Lesson Studio recovered with degraded feeds: ${failedSources.join(', ')}. Draft creation stays live because a usable curriculum context is still available.`
            : 'Lesson Studio recovered the requested launch context to the module’s actual subject lane before opening the authoring form.'}
          {assetPayloadIssues.length ? ` Sanitized asset issues: ${assetPayloadIssues.join(' ')}` : ''}
        </div>
      ) : null}

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
          key={lessonCreateFormKey}
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
