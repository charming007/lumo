import Link from 'next/link';
import { AssetLibraryFilters, AssetLibraryTable, AssetRegisterForm, AssetUploadForm } from '../../../components/asset-library-forms';
import { DeploymentBlockerCard } from '../../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../../components/feedback-banner';
import { fetchCurriculumModules, fetchLessonAssets, fetchLessons, fetchSubjects } from '../../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../../lib/config';
import { PageShell } from '../../../lib/ui';

function statusCounts(items: Awaited<ReturnType<typeof fetchLessonAssets>>) {
  return items.reduce((acc, item) => {
    const key = item.status ?? 'ready';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export default async function AssetLibraryPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const query = (await searchParams) || {};
  const filters = {
    q: query.q || '',
    kind: query.kind || '',
    status: query.status || '',
    tag: query.tag || '',
    subjectId: query.subjectId || '',
    moduleId: query.moduleId || '',
    lessonId: query.lessonId || '',
    includeArchived: query.includeArchived || '',
  };

  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Asset Library"
        subtitle="Production wiring is incomplete, so the asset registry is blocked instead of exploding behind a dead backend dependency."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: asset library API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} This route depends on live subject, module, lesson, and asset inventory feeds, so pretending the library is healthy would be nonsense.
          </>
        )}
        whyBlocked={[
          'Asset Library is an operational route, not decorative chrome. If the LMS cannot reach the live API, uploads, registry search, and edit/delete actions are all fiction.',
          'Blocking here is better than dropping operators into a Next.js error page when the first asset fetch fails on Vercel.',
          'This keeps the asset route consistent with the rest of the LMS admin surfaces already enforcing production API safety.',
        ]}
        verificationItems={[
          {
            surface: 'Asset library route',
            expected: 'Loads live asset rows or shows this blocker card before any fetch crashes server rendering',
            failure: '500 error page, digest stack, or blank route when production API wiring is broken',
          },
          {
            surface: 'Upload / register forms',
            expected: 'Subject, module, and lesson scope pickers populate from the live backend before operators submit media records',
            failure: 'Broken form shell, empty scope selectors, or actions that post into a dead backend',
          },
          {
            surface: 'Configured API base URL',
            expected: `Uses a real HTTPS production host such as ${API_BASE_DIAGNOSTIC.expectedFormat}`,
            failure: `Placeholder, localhost, invalid, or non-HTTPS value${API_BASE_DIAGNOSTIC.configuredApiBase ? ` like ${API_BASE_DIAGNOSTIC.configuredApiBase}` : ''}`,
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Content board', href: '/content', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Lesson Studio', href: '/content/lessons/new', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const [subjectsResult, modulesResult, lessonsResult, assetsResult] = await Promise.allSettled([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchLessonAssets({
      q: filters.q || undefined,
      kind: filters.kind || undefined,
      status: filters.status || undefined,
      tag: filters.tag || undefined,
      subjectId: filters.subjectId || undefined,
      moduleId: filters.moduleId || undefined,
      lessonId: filters.lessonId || undefined,
      includeArchived: filters.includeArchived || undefined,
    }),
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
  const missingCoreLibraryFeeds = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
  ].filter(Boolean) as string[];

  if (missingCoreLibraryFeeds.length) {
    return (
      <DeploymentBlockerCard
        title="Asset Library"
        subtitle="Critical library feeds are degraded, so asset operations are blocked instead of crashing the route or letting operators submit blind."
        blockerHeadline="Deployment blocker: asset library dependencies are down."
        blockerDetail={(
          <>
            Asset Library cannot safely scope uploads or registry edits without the live curriculum hierarchy. Failed feed{failedSources.length === 1 ? '' : 's'}: {failedSources.join(', ')}.
          </>
        )}
        whyBlocked={[
          'Uploading or registering media without live subject/module/lesson context is how you create orphaned assets and garbage scope wiring.',
          'A production asset route throwing a server error on Vercel is a deployment bug, not a tolerable degraded state.',
          'Blocking loudly here keeps operators out of half-working asset actions until the upstream feeds recover.',
        ]}
        verificationItems={[
          {
            surface: 'Asset library route',
            expected: 'Loads scope pickers and asset results when the curriculum hierarchy is healthy, or shows this blocker card when it is not',
            failure: 'Next.js error page or a route that pretends uploads are safe without live scope data',
          },
          {
            surface: 'Asset inventory feed',
            expected: 'Existing assets load when the assets feed is healthy, but the route still boots if only the asset list itself is temporarily down',
            failure: 'Whole page crashes because one data source rejected',
          },
          {
            surface: 'Recovery path',
            expected: 'Operators can return to upload/register/edit flows as soon as subjects/modules/lessons recover',
            failure: 'Library stays blocked after core dependency recovery',
          },
        ]}
        fixItems={[
          { label: 'Failing feeds', value: missingCoreLibraryFeeds.join(', ') },
          { label: 'Operator action', value: 'Restore subject/module/lesson inventory before using asset workflows' },
          { label: 'Optional feed', value: assetsResult.status === 'rejected' ? 'Existing asset rows are currently unavailable' : 'Existing asset rows are healthy' },
        ]}
        docs={[
          { label: 'Content board', href: '/content', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Lesson Studio', href: '/content/lessons/new', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
        ]}
      />
    );
  }

  const counts = statusCounts(assets);
  const previewableCount = assets.filter((asset) => Boolean(asset.fileUrl) && ['image', 'illustration', 'audio'].includes(asset.kind)).length;

  return <PageShell
    title="Asset Library"
    subtitle="Upload media, register existing files, search the catalog, and manage trustworthy lesson assets without spreadsheet hell."
    breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content Library', href: '/content' }]}
    aside={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}><Link href="/content" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>Back to content</Link></div>}
  >
    <FeedbackBanner message={query?.message} />
    {failedSources.length ? (
      <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
        Asset library is running in degraded mode: {failedSources.join(', ')} feed{failedSources.length === 1 ? ' is' : 's are'} unavailable.
      </div>
    ) : null}
    <section style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Filtered assets', value: assets.length, tone: { background: '#EEF2FF', color: '#3730A3' } },
          { label: 'Ready now', value: counts.ready ?? 0, tone: { background: '#ECFDF5', color: '#166534' } },
          { label: 'Archived', value: counts.archived ?? 0, tone: { background: '#FFF7ED', color: '#9A3412' } },
          { label: 'Previewable', value: previewableCount, tone: { background: '#F5F3FF', color: '#6D28D9' } },
        ].map((card) => (
          <div key={card.label} style={{ background: 'white', borderRadius: 18, padding: 18, border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>{card.label}</div>
            <div style={{ marginTop: 10, display: 'inline-flex', padding: '8px 12px', borderRadius: 999, fontWeight: 900, fontSize: 24, ...card.tone }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <AssetUploadForm returnPath="/content/assets" subjects={subjects} modules={modules} lessons={lessons} />
        <AssetRegisterForm returnPath="/content/assets" subjects={subjects} modules={modules} lessons={lessons} />
      </div>
      <AssetLibraryFilters subjects={subjects} modules={modules} lessons={lessons} filters={filters} totalCount={assets.length} />
      <AssetLibraryTable items={assets} returnPath="/content/assets" subjects={subjects} modules={modules} lessons={lessons} />
    </section>
  </PageShell>;
}
