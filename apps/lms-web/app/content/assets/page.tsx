import Link from 'next/link';
import { AssetLibraryFilters, AssetLibraryTable, AssetRegisterForm, AssetUploadForm } from '../../../components/asset-library-forms';
import { FeedbackBanner } from '../../../components/feedback-banner';
import { fetchCurriculumModules, fetchLessonAssets, fetchLessons, fetchSubjects } from '../../../lib/api';
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

  const [subjects, modules, lessons, assets] = await Promise.all([
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

  const counts = statusCounts(assets);
  const previewableCount = assets.filter((asset) => Boolean(asset.fileUrl) && ['image', 'illustration', 'audio'].includes(asset.kind)).length;

  return <PageShell
    title="Asset Library"
    subtitle="Upload media, register existing files, search the catalog, and manage trustworthy lesson assets without spreadsheet hell."
    breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content Library', href: '/content' }]}
    aside={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}><Link href="/content" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>Back to content</Link></div>}
  >
    <FeedbackBanner message={query?.message} />
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
