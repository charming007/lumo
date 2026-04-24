import { fetchAssessments, fetchWorkboard } from '../../lib/api';
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
