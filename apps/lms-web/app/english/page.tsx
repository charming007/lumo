import { createLessonAction } from '../actions';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
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

  const [subjectsResult, modulesResult, assessmentsResult, assetsResult] = await Promise.allSettled([
    fetchSubjects(),
    fetchCurriculumModules(),
    fetchAssessments(),
    fetchLessonAssets({ includeArchived: 'true' }),
  ]);

  const subjects = subjectsResult.status === 'fulfilled' ? subjectsResult.value : [];
  const modules = modulesResult.status === 'fulfilled' ? modulesResult.value : [];
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const assets = assetsResult.status === 'fulfilled' ? assetsResult.value : [];

  const failedSources = [
    subjectsResult.status === 'rejected' ? 'subjects' : null,
    modulesResult.status === 'rejected' ? 'modules' : null,
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    assetsResult.status === 'rejected' ? 'assets' : null,
  ].filter(Boolean) as string[];

  const hasCriticalAuthoringGap = subjectsResult.status === 'rejected' || modulesResult.status === 'rejected';

  if (hasCriticalAuthoringGap) {
    return (
      <DeploymentBlockerCard
        title="English Studio"
        subtitle="Critical curriculum feeds are degraded, so English lesson authoring is blocked instead of crashing into a server error page."
        blockerHeadline="Deployment blocker: English authoring context could not be recovered."
        blockerDetail={(
          <>
            English Studio cannot safely create a lesson when the {failedSources.join(', ')} feed{failedSources.length === 1 ? '' : 's'} failed. The exact blocker is missing English subject/module context, not a fake “everything is broken” shrug. Failed feed{failedSources.length === 1 ? '' : 's'}: {failedSources.join(', ')}.
          </>
        )}
        whyBlocked={[
          'This route is supposed to create a real lesson shell, not guess at a subject/module lane after upstream curriculum feeds fall over.',
          'Silently rendering an empty authoring form would let operators create content in the wrong lane or assume English scope disappeared.',
          'A loud blocker is safer than a 500 and much safer than polished nonsense.',
        ]}
        verificationItems={[
          {
            surface: 'English subject feed',
            expected: 'At least one live English subject loads so the authoring lane has real ownership context',
            failure: 'Route crashes or opens with no trustworthy English subject context',
          },
          {
            surface: 'English module feed',
            expected: 'At least one valid English module is available for lesson creation',
            failure: 'Operators can reach a form without a real module lane',
          },
          {
            surface: 'English Studio recovery',
            expected: 'After feed recovery, the route opens the full authoring form and preserves live curriculum context',
            failure: 'Page stays blocked or crashes after subjects/modules recover',
          },
        ]}
        fixItems={[
          { label: 'Failing feeds', value: failedSources.join(', ') },
          { label: 'Operator action', value: 'Restore English subject/module curriculum feeds before using this route for lesson creation' },
          { label: 'Cross-check', value: 'Verify /content, /canvas, and /content/lessons/new once feeds recover' },
        ]}
        docs={[
          { label: 'Open content board', href: '/content?view=blocked', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Open canvas', href: '/canvas', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Open dashboard', href: '/', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
        ]}
      />
    );
  }

  return (
    <AppShell seedCount={0} buildSignature={buildSignature}>
      <section style={{ display: 'grid', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6366f1', fontWeight: 800 }}>English Studio</div>
          <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05 }}>English reading and speaking lane</h1>
          <p style={{ margin: 0, color: '#475569', fontSize: 16, lineHeight: 1.7, maxWidth: 860 }}>
            Build English lesson shells against the live curriculum, keep the activity spine honest, and block loudly when authoring context goes missing.
          </p>
        </div>

        {failedSources.length ? (
          <div style={{ padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
            English Studio recovered with degraded support feeds: {failedSources.join(', ')}. Core authoring stays live because subject and module context survived, but supporting assessment or asset guidance may be incomplete until those feeds recover.
          </div>
        ) : null}

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
