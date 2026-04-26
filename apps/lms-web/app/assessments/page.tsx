import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { fetchAssessments, fetchWorkboard } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

function sectionAlert(message: string, tone: 'warning' | 'neutral' = 'neutral') {
  const palette = tone === 'warning'
    ? { background: '#fff7ed', border: '#fed7aa', text: '#9a3412' }
    : { background: '#f8fafc', border: '#e2e8f0', text: '#64748b' };

  return (
    <div style={{ padding: '14px 16px', borderRadius: 16, background: palette.background, border: `1px solid ${palette.border}`, color: palette.text, lineHeight: 1.6 }}>
      {message}
    </div>
  );
}

export default async function AssessmentsPage() {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Assessments"
        subtitle="Production wiring is incomplete, so progression and gate review stop here instead of faking a clean readiness picture."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: assessments API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} the assessments board cannot be trusted for progression gates, readiness review, or manual verification. Fix the env var, redeploy, then verify live assessment data.
          </>
        )}
        whyBlocked={[
          'Assessments is part of the pilot release gate. Showing empty or partial rows here would imply learners are ready to move when the LMS is actually disconnected.',
          'This route depends on live assessment records plus workboard readiness data. Missing production wiring turns every “looks clear” state into fiction.',
        ]}
        verificationItems={[
          {
            surface: 'Assessment table',
            expected: 'Live assessment rows load with subject, module, trigger, gate, and status data from the backend',
            failure: 'Blank or tiny table that looks safe only because the API never connected',
          },
          {
            surface: 'Readiness summary',
            expected: 'The readiness count reflects the live workboard instead of a fallback shell',
            failure: 'A calm zero or stale number appears while the app is disconnected',
          },
          {
            surface: 'Pilot progression review',
            expected: 'Operators can cross-check gate definitions against real learner readiness before advancing anyone',
            failure: 'The route suggests progression is reviewable even though the backend is unreachable',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Progress board', href: '/progress', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const [assessmentsResult, workboardResult] = await Promise.allSettled([fetchAssessments(), fetchWorkboard()]);
  const assessments = assessmentsResult.status === 'fulfilled' ? assessmentsResult.value : [];
  const workboard = workboardResult.status === 'fulfilled' ? workboardResult.value : [];
  const ready = workboard.filter((item) => item.progressionStatus === 'ready').length;
  const failedSources = [
    assessmentsResult.status === 'rejected' ? 'assessments' : null,
    workboardResult.status === 'rejected' ? 'workboard' : null,
  ].filter(Boolean);

  return (
    <PageShell title="Assessments" subtitle="Automatic and manual progression checks tied directly to learner readiness and module movement.">
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Assessments view degraded gracefully: {failedSources.join(' + ')} feed {failedSources.length === 1 ? 'is' : 'are'} unavailable.
        </div>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 16, marginBottom: 20 }}>
        <Card title="Progression picture" eyebrow="Readiness">
          <div style={{ fontSize: 42, fontWeight: 900, color: '#6C63FF', marginBottom: 8 }}>{ready}</div>
          <div style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>Learners currently qualify for the next gate based on existing mastery and progression flags.</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {workboardResult.status === 'rejected' ? sectionAlert('The learner readiness workboard did not load, so the big readiness number above is temporarily stale.', 'warning') : null}
            {assessments.length ? assessments.map((assessment) => (
              <div key={assessment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid #eef2f7' }}>
                <span>{assessment.title}</span>
                <Pill label={assessment.kind} />
              </div>
            )) : sectionAlert(
              assessmentsResult.status === 'rejected'
                ? 'Assessment records are unavailable right now. Retry once the API feed recovers.'
                : 'No assessment gates are configured yet.'
            )}
          </div>
        </Card>
        <SimpleTable
          columns={['Assessment', 'Subject', 'Module', 'Trigger', 'Gate', 'Status']}
          rows={assessments.length ? assessments.map((assessment) => [
            assessment.title,
            assessment.subjectName,
            assessment.moduleTitle,
            assessment.triggerLabel,
            assessment.progressionGate,
            <Pill key={assessment.id} label={assessment.status} tone="#DCFCE7" text="#166534" />,
          ]) : [[sectionAlert(assessmentsResult.status === 'rejected' ? 'Assessment table unavailable — the feed failed.' : 'No assessment gates are available yet.'), '', '', '', '', '']]}
        />
      </section>
    </PageShell>
  );
}
