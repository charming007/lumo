import { fetchAssessments, fetchWorkboard } from '../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../lib/ui';

export default async function AssessmentsPage() {
  const [assessments, workboard] = await Promise.all([fetchAssessments(), fetchWorkboard()]);
  const ready = workboard.filter((item) => item.progressionStatus === 'ready').length;

  return (
    <PageShell title="Assessments" subtitle="Automatic and manual progression checks tied directly to learner readiness and module movement.">
      <section style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 16, marginBottom: 20 }}>
        <Card title="Progression picture" eyebrow="Readiness">
          <div style={{ fontSize: 42, fontWeight: 900, color: '#6C63FF', marginBottom: 8 }}>{ready}</div>
          <div style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>Learners currently qualify for the next gate based on existing mastery and progression flags.</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {assessments.map((assessment) => (
              <div key={assessment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid #eef2f7' }}>
                <span>{assessment.title}</span>
                <Pill label={assessment.kind} />
              </div>
            ))}
          </div>
        </Card>
        <SimpleTable
          columns={['Assessment', 'Subject', 'Module', 'Trigger', 'Gate', 'Status']}
          rows={assessments.map((assessment) => [
            assessment.title,
            assessment.subjectName,
            assessment.moduleTitle,
            assessment.triggerLabel,
            assessment.progressionGate,
            <Pill key={assessment.id} label={assessment.status} tone="#DCFCE7" text="#166534" />,
          ])}
        />
      </section>
    </PageShell>
  );
}
