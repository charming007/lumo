import Link from 'next/link';
import { AssetLibraryFilters, AssetLibraryTable, AssetRegisterForm, AssetUploadForm } from '../../../components/asset-library-forms';
import { DeploymentBlockerCard } from '../../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../../components/feedback-banner';
import { ApiRequestError, fetchAssetRuntime, fetchConfigAudit, fetchCurriculumModules, fetchLessonAssets, fetchLessons, fetchSubjects, fetchStorageStatus } from '../../../lib/api';
import { API_BASE, API_BASE_DIAGNOSTIC, API_BASE_SOURCE } from '../../../lib/config';
import { sanitizeInternalReturnPath } from '../../../lib/safe-return-path';
import { PageShell } from '../../../lib/ui';

function statusCounts(items: Awaited<ReturnType<typeof fetchLessonAssets>>) {
  return items.reduce((acc, item) => {
    const key = item.status ?? 'ready';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function buildRouteWithQuery(basePath: string, params: Record<string, string>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }

  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function runtimeReadinessTone(readiness?: 'ready' | 'degraded' | 'blocked') {
  if (readiness === 'ready') {
    return { background: '#ECFDF5', border: '1px solid #BBF7D0', accent: '#166534', chipBackground: '#DCFCE7', chipColor: '#166534' };
  }

  if (readiness === 'blocked') {
    return { background: '#FEF2F2', border: '1px solid #FECACA', accent: '#B91C1C', chipBackground: '#FEE2E2', chipColor: '#B91C1C' };
  }

  return { background: '#FFF7ED', border: '1px solid #FDBA74', accent: '#9A3412', chipBackground: '#FFEDD5', chipColor: '#9A3412' };
}

function isExactAssetRegistry404(error: unknown) {
  return error instanceof ApiRequestError && error.status === 404 && error.path === '/api/v1/assets';
}

function describeApiSource(source: typeof API_BASE_SOURCE) {
  switch (source) {
    case 'env':
      return 'NEXT_PUBLIC_API_BASE_URL';
    case 'local-fallback':
      return 'local fallback (env missing outside production)';
    case 'missing-production-env':
      return 'missing production env';
    case 'invalid-production-env':
      return 'invalid production env';
    default:
      return source;
  }
}

function describeAssetRegistryFailure(error: unknown) {
  const assetEndpoint = `${API_BASE}/api/v1/assets`;

  if (error instanceof ApiRequestError && error.path === '/api/v1/assets' && error.status === 404) {
    return {
      summary: `Live asset registry route missing: the LMS reached ${assetEndpoint}, but the deployed backend answered 404 for /api/v1/assets. This is a deployment mismatch, not an empty library.`,
      operatorGuidance: `Most likely causes: (1) the live API deployment is outdated and does not ship the /api/v1/assets route yet, (2) NEXT_PUBLIC_API_BASE_URL points the LMS at the wrong backend/base URL, or (3) a proxy/rewrite is stripping the /api/v1 prefix before the request reaches the API. Verify the exact deployed API behind NEXT_PUBLIC_API_BASE_URL, then hit ${assetEndpoint} directly and confirm it serves the assets route before trusting this page again.`,
      shortLabel: 'Live backend route missing or LMS is pointed at the wrong API base',
      rootCauseChecklist: [
        'Stale API deployment: the running backend predates the asset registry routes that exist in this repo.',
        'Wrong API base: NEXT_PUBLIC_API_BASE_URL points the LMS at a different backend than the one you think is live.',
        'Proxy/rewrite damage: /api/v1 is being stripped or rewritten before the request reaches the API.',
      ],
    };
  }

  if (error instanceof ApiRequestError) {
    return {
      summary: `Live asset registry request failed: ${assetEndpoint} returned HTTP ${error.status}. This is a live backend/API-base problem, not proof that the library is empty.`,
      operatorGuidance: `Verify NEXT_PUBLIC_API_BASE_URL, then hit ${assetEndpoint} directly and inspect the deployed API logs/config audit before trusting asset operations again.`,
      shortLabel: `Live asset registry request failed with HTTP ${error.status}`,
      rootCauseChecklist: [
        'Wrong or stale API deployment behind NEXT_PUBLIC_API_BASE_URL.',
        'Auth, proxy, or platform issue returning HTTP errors before the asset handler responds normally.',
        'Backend regression that is breaking the live asset registry endpoint even though the route exists in source.',
      ],
    };
  }

  const message = error instanceof Error && error.message.trim()
    ? error.message.trim()
    : 'The live asset registry API rejected the listing request.';

  return {
    summary: `Live asset registry request failed for ${assetEndpoint}. This is a backend/API wiring issue, not an empty library. ${message}`,
    operatorGuidance: `Verify NEXT_PUBLIC_API_BASE_URL, then hit ${assetEndpoint} directly and inspect the deployed API logs/config audit before trusting asset operations again.`,
    shortLabel: 'Live asset registry request failed',
    rootCauseChecklist: [
      'Wrong or unreachable API base URL in the LMS deployment.',
      'Backend runtime or platform failure preventing the asset handler from answering normally.',
      'Proxy/rewrite mismatch between the LMS and the deployed API edge.',
    ],
  };
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
  const from = sanitizeInternalReturnPath(query.from, '');
  const assetLibraryHref = buildRouteWithQuery('/content/assets', {
    ...filters,
    from,
  });
  const assetLibraryResetHref = buildRouteWithQuery('/content/assets', { from });

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

  const [subjectsResult, modulesResult, lessonsResult, assetsResult, storageStatusResult, configAuditResult, assetRuntimeResult] = await Promise.allSettled([
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
    fetchStorageStatus(),
    fetchConfigAudit(),
    fetchAssetRuntime(8),
  ]);

  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const lessons = lessonsResult.status === 'fulfilled' ? lessonsResult.value : [];
  const assets = assetsResult.status === 'fulfilled' ? assetsResult.value : [];
  const assetListingAvailable = assetsResult.status === 'fulfilled';
  const storageStatus = storageStatusResult.status === 'fulfilled' ? storageStatusResult.value : null;
  const configAudit = configAuditResult.status === 'fulfilled' ? configAuditResult.value : null;
  const assetRuntime = assetRuntimeResult.status === 'fulfilled' ? assetRuntimeResult.value : null;
  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
    assetsResult.status === 'rejected' ? 'assets' : null,
    assetRuntimeResult.status === 'rejected' ? 'asset runtime' : null,
  ].filter(Boolean) as string[];
  const missingCoreLibraryFeeds = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    lessonsResult.status === 'rejected' ? 'lessons' : null,
  ].filter(Boolean) as string[];
  const assetUploadsReady = configAudit?.assetUploads?.ready ?? null;
  const assetUploadBlocker = configAudit?.assetUploads?.blocker ?? null;
  const assetUploadRoot = configAudit?.assetUploads?.root ?? storageStatus?.path ?? null;
  const assetListingFailure = assetsResult.status === 'rejected'
    ? describeAssetRegistryFailure(assetsResult.reason)
    : null;
  const assetListingFailureDetail = assetListingFailure?.summary ?? null;
  const assetFeedFailed = assetsResult.status === 'rejected';
  const assetEndpoint = `${API_BASE}/api/v1/assets`;
  const assetRuntimeEndpoint = `${API_BASE}/api/v1/admin/assets/runtime`;
  const configAuditEndpoint = `${API_BASE}/api/v1/admin/config/audit`;
  const storageStatusEndpoint = `${API_BASE}/api/v1/admin/storage/status`;
  const apiTargetSourceLabel = describeApiSource(API_BASE_SOURCE);
  const storageUploadsBlocked = assetUploadsReady === false;
  const configAuditReady = configAudit?.summary?.ready ?? null;
  const configAuditStatusLabel = configAuditReady === null ? 'Config audit unavailable' : configAuditReady ? 'Config audit passed' : 'Config audit degraded';
  const runtimeOnlyRegistryOutage = assetFeedFailed && !missingCoreLibraryFeeds.length;
  const apiTargetMismatchLikely = runtimeOnlyRegistryOutage && assetRuntime?.routeEvidence?.ready;
  const degradedActionLabel = storageUploadsBlocked
    ? 'Check asset upload env + storage, then use Register external asset until it is fixed'
    : runtimeOnlyRegistryOutage
      ? (assetListingFailure?.shortLabel ?? 'Treat this as a live API/runtime outage on the asset registry endpoint, not an empty-library result')
      : 'Core curriculum scope is missing — restore subject/module/lesson feeds first';
  const degradedActionDetail = storageUploadsBlocked
    ? `${assetUploadBlocker ?? 'Upload storage is unavailable.'}${assetUploadRoot ? ` Current root: ${assetUploadRoot}.` : ''} Inspect LUMO_ASSET_UPLOAD_DIR on the API service, then verify /api/v1/admin/config/audit, /api/v1/admin/storage/status, and /api/v1/admin/storage/integrity before retrying uploads.`
    : runtimeOnlyRegistryOutage
      ? (assetListingFailure?.operatorGuidance ?? 'Subjects, modules, and lessons still loaded, so this is not just the page shell collapsing. The failing piece is the live asset registry feed itself. Check NEXT_PUBLIC_API_BASE_URL in the LMS, API_BASE_URL/LUMO_PUBLIC_API_URL on the API if runtime file links look wrong, then hit /api/v1/assets and /api/v1/admin/config/audit on the deployed API before trusting this route again.')
      : 'Without live subject, module, and lesson scope, any asset operation risks creating orphaned media records.';

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

  const counts = assetListingAvailable ? statusCounts(assets) : {};
  const previewableCount = assetListingAvailable
    ? assets.filter((asset) => Boolean(asset.fileUrl) && ['image', 'illustration', 'audio'].includes(asset.kind)).length
    : null;
  const skippedRegistryRecords = assetRuntime?.summary?.skippedRecordCount ?? null;
  const brokenManagedRefs = assetRuntime?.summary?.brokenManagedReferenceCount ?? null;
  const runtimeTone = runtimeReadinessTone(assetRuntime?.summary?.readiness);

  return <PageShell
    title="Asset Library"
    subtitle="Upload media, register existing files, search the catalog, and manage trustworthy lesson assets without spreadsheet hell."
    breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content Library', href: '/content' }]}
    aside={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {from ? <Link href={from} style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>Back to lesson authoring</Link> : null}
      <Link href="/content" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>Back to content</Link>
    </div>}
  >
    <FeedbackBanner message={query?.message} />
    {failedSources.length ? (
      <div style={{ marginBottom: 16, padding: '16px 18px', borderRadius: 18, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700, display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div>
            Asset library is running in degraded mode: {failedSources.join(', ')} feed{failedSources.length === 1 ? ' is' : 's are'} unavailable.
          </div>
          <div style={{ color: '#7c2d12', lineHeight: 1.6, fontWeight: 600 }}>
            Next best move: {degradedActionLabel}.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(251,146,60,0.28)' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#9a3412' }}>Do this first</div>
            <div style={{ marginTop: 8, color: '#7c2d12', lineHeight: 1.6, fontWeight: 600 }}>{degradedActionDetail}</div>
          </div>
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(251,146,60,0.28)' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#9a3412' }}>Operator fallback</div>
            <div style={{ marginTop: 8, color: '#7c2d12', lineHeight: 1.6, fontWeight: 600 }}>
              {storageUploadsBlocked
                ? 'Skip storage-backed uploads for now. Register the external runtime URL or object-store key, then fix LUMO_ASSET_UPLOAD_DIR permissions/path on the API service before coming back.'
                : assetFeedFailed
                  ? 'Do not trust an empty asset table as proof the library is clean. If /api/v1/assets is 404, that means the live backend route is missing, the LMS is pointed at the wrong deployed API base, or a proxy/rewrite is mangling the path.'
                  : 'Restore curriculum scope first, then come back here. Asset actions without real lesson/module context are how orphaned files happen.'}
            </div>
          </div>
          {assetFeedFailed && assetListingFailureDetail ? (
            <div style={{ padding: 14, borderRadius: 14, background: '#FFEDD5', border: '1px solid #FDBA74' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#9a3412' }}>Registry listing failure</div>
              <div style={{ marginTop: 8, color: '#7c2d12', lineHeight: 1.6, fontWeight: 600 }}>{assetListingFailureDetail}</div>
            </div>
          ) : null}
          {runtimeOnlyRegistryOutage ? (
            <>
              <div style={{ padding: 14, borderRadius: 14, background: '#FFF7ED', border: '1px solid #FDBA74' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#9a3412' }}>Runtime signal</div>
                <div style={{ marginTop: 8, color: '#7c2d12', lineHeight: 1.6, fontWeight: 600 }}>
                  Subject/module/lesson feeds are alive, but <code>/api/v1/assets</code> is not. If that request is returning 404, the live backend does not have the route, the LMS is pointed at the wrong deployed API base, or a proxy/rewrite is stripping <code>/api/v1</code>. {configAuditStatusLabel}. Upload storage is {assetUploadsReady === null ? 'unknown' : assetUploadsReady ? 'ready' : 'blocked'}{assetUploadRoot ? ` at ${assetUploadRoot}` : ''}. Treat this as a deployed backend mismatch until the registry endpoint recovers.
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 14, background: apiTargetMismatchLikely ? '#FEE2E2' : '#FFF7ED', border: apiTargetMismatchLikely ? '1px solid #FCA5A5' : '1px solid #FDBA74' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: apiTargetMismatchLikely ? '#991B1B' : '#9a3412' }}>Backend target evidence</div>
                <div style={{ marginTop: 8, color: apiTargetMismatchLikely ? '#7F1D1D' : '#7c2d12', lineHeight: 1.6, fontWeight: 600 }}>
                  LMS target: <code>{API_BASE}</code> ({apiTargetSourceLabel}). Asset runtime endpoint: <code>{assetRuntimeEndpoint}</code>. Config audit endpoint: <code>{configAuditEndpoint}</code>.{apiTargetMismatchLikely ? ' The runtime endpoint says this API build has the asset routes mounted, so a live 404 from the library almost certainly means the LMS is pointed at the wrong/stale backend or a proxy is mangling the path — not that the frontend randomly broke.' : ''}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/settings" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#ffffff', color: '#9a3412', border: '1px solid #fdba74' }}>Open settings + config audit</Link>
          <Link href="/content" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B' }}>Open content board</Link>
        </div>
      </div>
    ) : null}
    <section style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Filtered assets', value: assetListingAvailable ? assets.length : '—', tone: { background: '#EEF2FF', color: '#3730A3' } },
          { label: 'Ready now', value: assetListingAvailable ? (counts.ready ?? 0) : '—', tone: { background: '#ECFDF5', color: '#166534' } },
          { label: 'Archived', value: assetListingAvailable ? (counts.archived ?? 0) : '—', tone: { background: '#FFF7ED', color: '#9A3412' } },
          { label: 'Previewable', value: assetListingAvailable ? previewableCount : '—', tone: { background: '#F5F3FF', color: '#6D28D9' } },
          { label: 'Skipped registry rows', value: skippedRegistryRecords ?? '—', tone: { background: '#FFF7ED', color: '#9A3412' } },
          { label: 'Broken managed refs', value: brokenManagedRefs ?? '—', tone: { background: '#FEE2E2', color: '#B91C1C' } },
        ].map((card) => (
          <div key={card.label} style={{ background: 'white', borderRadius: 18, padding: 18, border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>{card.label}</div>
            <div style={{ marginTop: 10, display: 'inline-flex', padding: '8px 12px', borderRadius: 999, fontWeight: 900, fontSize: 24, ...card.tone }}>{card.value}</div>
          </div>
        ))}
      </div>

      {assetRuntime ? (
        <div style={{ display: 'grid', gap: 14, padding: 18, borderRadius: 20, background: runtimeTone.background, border: runtimeTone.border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: runtimeTone.accent, fontWeight: 800 }}>Live runtime readiness</div>
              <div style={{ color: '#0F172A', fontSize: 22, fontWeight: 900 }}>{assetRuntime.summary.headline}</div>
              <div style={{ color: '#475569', lineHeight: 1.6, maxWidth: 880 }}>{assetRuntime.summary.operatorAction}</div>
            </div>
            <div style={{ display: 'inline-flex', padding: '8px 12px', borderRadius: 999, fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, background: runtimeTone.chipBackground, color: runtimeTone.chipColor }}>
              {assetRuntime.summary.readiness}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(148, 163, 184, 0.18)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>Uploads</div>
              <div style={{ marginTop: 8, color: '#0F172A', fontWeight: 800 }}>{assetRuntime.uploads.ready ? 'Managed uploads ready' : 'Managed uploads blocked'}</div>
              <div style={{ marginTop: 6, color: '#475569', lineHeight: 1.6 }}>{assetRuntime.uploads.blocker ?? `Root: ${assetRuntime.uploads.root ?? 'unknown'}`}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(148, 163, 184, 0.18)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>Runtime issue load</div>
              <div style={{ marginTop: 8, color: '#0F172A', fontWeight: 800 }}>{assetRuntime.summary.lessonsWithIssues} lessons, {assetRuntime.registry.issueCount} surfaced issue{assetRuntime.registry.issueCount === 1 ? '' : 's'}</div>
              <div style={{ marginTop: 6, color: '#475569', lineHeight: 1.6 }}>{assetRuntime.summary.unresolvedReferenceCount} unresolved refs • {assetRuntime.summary.brokenManagedReferenceCount} broken managed refs • {assetRuntime.summary.orphanedAssetCount} orphaned assets</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(148, 163, 184, 0.18)' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>Mounted asset routes</div>
              <div style={{ marginTop: 8, color: '#0F172A', fontWeight: 800 }}>
                {assetRuntime.routeEvidence?.ready
                  ? `${assetRuntime.routeEvidence.mountedCount}/${assetRuntime.routeEvidence.expectedCount} critical asset routes mounted in this API build`
                  : 'Critical asset routes missing from this API build'}
              </div>
              <div style={{ marginTop: 6, color: '#475569', lineHeight: 1.6 }}>
                {assetRuntime.routeEvidence?.ready
                  ? 'Repo/runtime route evidence says the asset handlers are mounted here. A live 404 from the LMS points to the wrong deployed backend, stale API build, or a proxy rewrite stripping /api/v1 before requests arrive.'
                  : 'This API process itself is missing one of the required asset routes. Redeploy the backend that includes the asset registry handlers before trusting the LMS asset screens.'}
              </div>
            </div>
          </div>

          {assetRuntime.nextActions.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>Do this next</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {assetRuntime.nextActions.map((action) => (
                  <div key={action} style={{ padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(148, 163, 184, 0.22)', color: '#334155', lineHeight: 1.6 }}>{action}</div>
                ))}
              </div>
            </div>
          ) : null}

          {assetRuntime.registry.topIssues.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748B', fontWeight: 800 }}>Top runtime issues</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {assetRuntime.registry.topIssues.slice(0, 4).map((issue, index) => (
                  <div key={`${issue.type}-${issue.assetId ?? issue.value ?? index}`} style={{ padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(148, 163, 184, 0.22)', display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ color: '#0F172A', fontWeight: 800 }}>{issue.lessonTitle ?? issue.assetTitle ?? issue.type}</div>
                      <div style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: 999, background: issue.severity === 'error' ? '#FEE2E2' : '#FEF3C7', color: issue.severity === 'error' ? '#B91C1C' : '#92400E', fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>{issue.severity}</div>
                    </div>
                    <div style={{ color: '#475569', lineHeight: 1.6 }}>{issue.note ?? issue.type}</div>
                    <div style={{ color: '#64748B', fontSize: 12 }}>{issue.value ? `Reference: ${issue.value}` : issue.assetId ? `Asset: ${issue.assetId}` : issue.type}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {assetFeedFailed ? (
        <div style={{ display: 'grid', gap: 16, padding: 18, borderRadius: 20, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#B91C1C', fontWeight: 800 }}>Asset writes intentionally disabled</div>
            <div style={{ color: '#0F172A', fontSize: 22, fontWeight: 900 }}>This page will not let operators upload, register, or edit assets while the live registry feed is failing.</div>
            <div style={{ color: '#7F1D1D', lineHeight: 1.7 }}>
              {assetListingFailureDetail ?? 'The live asset registry API is unavailable.'} If the listing request itself is broken, write flows against the same backend are not trustworthy either.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FECACA', display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#991B1B', fontWeight: 800 }}>LMS target</div>
              <div style={{ color: '#111827', fontWeight: 800, wordBreak: 'break-all' }}>{API_BASE}</div>
              <div style={{ color: '#7F1D1D', lineHeight: 1.6 }}>
                Asset list endpoint: <code>{assetEndpoint}</code>
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FECACA', display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#991B1B', fontWeight: 800 }}>Cross-check endpoints</div>
              <div style={{ color: '#7F1D1D', lineHeight: 1.6, wordBreak: 'break-all' }}><code>{assetRuntimeEndpoint}</code></div>
              <div style={{ color: '#7F1D1D', lineHeight: 1.6, wordBreak: 'break-all' }}><code>{configAuditEndpoint}</code></div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FECACA', display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#991B1B', fontWeight: 800 }}>Repo/runtime evidence</div>
              <div style={{ color: '#111827', fontWeight: 800 }}>
                {assetRuntime?.routeEvidence?.ready
                  ? `${assetRuntime.routeEvidence.mountedCount}/${assetRuntime.routeEvidence.expectedCount} critical asset routes mounted in this API build`
                  : 'Runtime route evidence unavailable or degraded'}
              </div>
              <div style={{ color: '#7F1D1D', lineHeight: 1.6 }}>
                Repo source already includes the asset routes. A live 404 here means stale deploy, wrong API target, or proxy damage until proven otherwise.
              </div>
            </div>
          </div>

          {assetListingFailure?.rootCauseChecklist?.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#991B1B', fontWeight: 800 }}>Most likely causes</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {assetListingFailure.rootCauseChecklist.map((item) => (
                  <div key={item} style={{ padding: 12, borderRadius: 14, background: '#fff', border: '1px solid #FECACA', color: '#7F1D1D', lineHeight: 1.6 }}>{item}</div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FECACA', display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#991B1B', fontWeight: 800 }}>Next operator steps</div>
              <div style={{ color: '#7F1D1D', lineHeight: 1.6 }}>
                1. Confirm the LMS target host above is the deployment you intended.<br />
                2. Hit <code>{assetEndpoint}</code>, <code>{assetRuntimeEndpoint}</code>, <code>{configAuditEndpoint}</code>, and <code>{storageStatusEndpoint}</code> directly against that same host.<br />
                3. If runtime/config endpoints are healthy but <code>/api/v1/assets</code> is 404, redeploy or repoint the backend. That is a backend target mismatch until proven otherwise.
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #FECACA', display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#991B1B', fontWeight: 800 }}>Do not confuse this with storage-only degradation</div>
              <div style={{ color: '#7F1D1D', lineHeight: 1.6 }}>
                Storage trouble means uploads or managed file reads degrade while the registry endpoints still answer. A dead or 404 asset listing endpoint means the LMS cannot trust writes or reads against the current backend target.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/settings" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#991B1B', color: '#fff', border: '1px solid #991B1B' }}>Open settings + config audit</Link>
            <Link href="/content" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#fff', color: '#991B1B', border: '1px solid #FCA5A5' }}>Back to content board</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <AssetUploadForm returnPath={assetLibraryHref} subjects={subjects} modules={modules} lessons={lessons} />
          <AssetRegisterForm returnPath={assetLibraryHref} subjects={subjects} modules={modules} lessons={lessons} />
        </div>
      )}
      <AssetLibraryFilters subjects={subjects} modules={modules} lessons={lessons} filters={filters} totalCount={assetListingAvailable ? assets.length : 0} resetHref={assetLibraryResetHref} />
      <AssetLibraryTable
        items={assets}
        returnPath={assetLibraryHref}
        subjects={subjects}
        modules={modules}
        lessons={lessons}
        unavailableReason={assetFeedFailed ? (assetListingFailureDetail ?? 'The live asset registry API is unavailable.') : null}
        unavailableTarget={assetFeedFailed ? API_BASE : null}
        unavailableTargetSource={assetFeedFailed ? apiTargetSourceLabel : null}
        unavailableEndpoints={assetFeedFailed ? [assetEndpoint, assetRuntimeEndpoint, configAuditEndpoint, storageStatusEndpoint] : undefined}
      />
    </section>
  </PageShell>;
}
