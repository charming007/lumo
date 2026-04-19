import Link from 'next/link';
import { AssetLibraryTable, AssetRegisterForm, AssetUploadForm } from '../../../components/asset-library-forms';
import { FeedbackBanner } from '../../../components/feedback-banner';
import { fetchCurriculumModules, fetchLessonAssets, fetchLessons, fetchSubjects } from '../../../lib/api';
import { PageShell } from '../../../lib/ui';

export default async function AssetLibraryPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const query = await searchParams;
  const [subjects, modules, lessons, assets] = await Promise.all([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchLessons(),
    fetchLessonAssets(),
  ]);

  return <PageShell
    title="Asset Library"
    subtitle="Upload media, register existing files, and browse copy-ready references for lesson authoring."
    breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content Library', href: '/content' }]}
    aside={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}><Link href="/content" style={{ borderRadius: 12, padding: '10px 12px', textDecoration: 'none', fontWeight: 800, background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' }}>Back to content</Link></div>}
  >
    <FeedbackBanner message={query?.message} />
    <section style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <AssetUploadForm returnPath="/content/assets" subjects={subjects} modules={modules} lessons={lessons} />
        <AssetRegisterForm returnPath="/content/assets" subjects={subjects} modules={modules} lessons={lessons} />
      </div>
      <AssetLibraryTable items={assets} />
    </section>
  </PageShell>;
}
