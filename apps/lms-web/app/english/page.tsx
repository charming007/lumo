import { createLessonAction } from '../actions';
import { FeedbackBanner } from '../../components/feedback-banner';
import { EnglishStudioAuthoringForm } from '../../components/english-studio-authoring-form';
import { AppShell } from '../../components/shell';
import { fetchAssessments, fetchCurriculumModules, fetchLessonAssets, fetchSubjects } from '../../lib/api';
import { getBuildSignature } from '../../lib/build-signature';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';

export default async function EnglishStudioPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const buildSignature = getBuildSignature();
  const query = await searchParams;

  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <AppShell seedCount={0} buildSignature={buildSignature}>
        <section style={{ display: 'grid', gap: 18 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: '24px', border: '1px solid #fecaca', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#b91c1c', fontWeight: 800 }}>English Studio</div>
            <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05 }}>Deployment blocker</h1>
            <p style={{ margin: 0, color: '#7f1d1d', fontSize: 16, lineHeight: 1.7, maxWidth: 860 }}>
              <code style={{ fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} English authoring should block loudly instead of pretending a lesson can be created from disconnected curriculum feeds.
            </p>
          </div>
        </section>
      </AppShell>
    );
  }

  const [subjects, modules, assessments, assets] = await Promise.all([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchAssessments(),
    fetchLessonAssets({ includeArchived: 'true' }),
  ]);

  return (
    <AppShell seedCount={0} buildSignature={buildSignature}>
      <section style={{ display: 'grid', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6366f1', fontWeight: 800 }}>English Studio</div>
          <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05 }}>English reading and speaking lane</h1>
          <p style={{ margin: 0, color: '#475569', fontSize: 16, lineHeight: 1.7, maxWidth: 860 }}>
            This route is supposed to be a working authoring lane, not a glossy holding page. Wire it to the live English curriculum so operators can create lessons, see blockers, and leave with a real lesson shell.
          </p>
        </div>

        <FeedbackBanner message={query?.message} />

        <EnglishStudioAuthoringForm
          subjects={subjects}
          modules={modules}
          assessments={assessments}
          assets={assets}
          action={createLessonAction}
        />
      </section>
    </AppShell>
  );
}
