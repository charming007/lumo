import { notFound } from 'next/navigation';
import { FeedbackBanner } from '../../../components/feedback-banner';
import { fetchMallam } from '../../../lib/api';
import { Card, PageShell, Pill, SimpleTable } from '../../../lib/ui';

export default async function MallamDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;

  try {
    const mallam = await fetchMallam(id);

    return (
      <PageShell title={mallam.displayName} subtitle="Mallam deployment detail with roster health, active assignments, and coaching cues.">
        <FeedbackBanner message={query?.message} />
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
          <Card title={String(mallam.summary.rosterCount)} eyebrow="Roster"><div style={{ color: '#64748b' }}>Learners directly mapped to this mallam.</div></Card>
          <Card title={String(mallam.summary.activeAssignments)} eyebrow="Active assignments"><div style={{ color: '#64748b' }}>Delivery blocks owned right now.</div></Card>
          <Card title={`${Math.round(mallam.summary.averageAttendance * 100)}%`} eyebrow="Avg attendance"><div style={{ color: '#64748b' }}>Across the current roster.</div></Card>
          <Card title={String(mallam.summary.watchCount)} eyebrow="Watchlist"><div style={{ color: '#64748b' }}>Learners needing tighter coaching support.</div></Card>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <Card title="Deployment profile" eyebrow="Readiness">
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Center', mallam.centerName ?? '—'],
                ['Region', mallam.region],
                ['Role', mallam.role],
                ['Certification', mallam.certificationLevel],
                ['Languages', mallam.languages?.join(', ') ?? '—'],
                ['Pods', mallam.podLabels.join(', ') || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ paddingBottom: 12, borderBottom: '1px solid #eef2f7' }}><span style={{ color: '#64748b' }}>{label}</span><div style={{ fontWeight: 800, marginTop: 4 }}>{value}</div></div>
              ))}
            </div>
          </Card>
          <Card title="Recommended actions" eyebrow="Coach the operator">
            <div style={{ display: 'grid', gap: 10 }}>
              {mallam.recommendedActions.map((action) => (
                <div key={action} style={{ padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc' }}>{action}</div>
              ))}
            </div>
          </Card>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
          <Card title="Roster detail" eyebrow="Learner ownership">
            <SimpleTable columns={['Learner', 'Cohort', 'Pod', 'Attendance', 'Level']} rows={mallam.roster.map((student) => [student.name, student.cohortName ?? '—', student.podLabel ?? '—', `${Math.round(student.attendanceRate * 100)}%`, `${student.level} · ${student.stage}`])} />
          </Card>
          <Card title="Active assignment board" eyebrow="Delivery queue">
            <div style={{ display: 'grid', gap: 12 }}>
              {mallam.assignments.map((assignment) => (
                <div key={assignment.id} style={{ padding: 16, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <strong>{assignment.lessonTitle}</strong>
                    <Pill label={assignment.status} tone={assignment.status === 'active' ? '#DCFCE7' : '#E0E7FF'} text={assignment.status === 'active' ? '#166534' : '#3730A3'} />
                  </div>
                  <div style={{ color: '#64748b', marginTop: 6 }}>{assignment.cohortName} • {assignment.podLabel ?? 'No pod'} • due {assignment.dueDate}</div>
                  <div style={{ color: '#64748b', marginTop: 4 }}>Assessment: {assignment.assessmentTitle ?? 'None attached'}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </PageShell>
    );
  } catch {
    notFound();
  }
}
