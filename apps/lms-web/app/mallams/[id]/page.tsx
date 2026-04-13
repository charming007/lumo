import { notFound } from 'next/navigation';
import { FeedbackBanner } from '../../../components/feedback-banner';
import { MallamRosterManager } from '../../../components/mallam-roster-manager';
import { fetchMallam, fetchMallams, fetchStudents } from '../../../lib/api';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../../../lib/ui';

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDate(date: string) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

function assignmentTone(status: string) {
  if (status === 'active') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'scheduled') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

export default async function MallamDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;

  try {
    const [mallam, allStudents, allMallams] = await Promise.all([fetchMallam(id), fetchStudents(), fetchMallams()]);
    const roster = mallam.roster ?? [];
    const candidateLearners = allStudents.filter((student) => student.mallamId !== mallam.id);
    const assignments = mallam.assignments ?? [];
    const watchLearners = roster.filter((student) => student.attendanceRate < 0.85);
    const stableLearners = roster.filter((student) => student.attendanceRate >= 0.9);
    const levelsInRoster = Array.from(new Set(roster.map((student) => `${student.level} · ${student.stage}`))).slice(0, 6);
    const assignmentTimeline = [...assignments]
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
    const nextAssignment = assignmentTimeline.find((assignment) => new Date(assignment.dueDate).getTime() >= new Date().setHours(0, 0, 0, 0)) ?? assignmentTimeline[0] ?? null;
    const recentAssignment = assignmentTimeline[assignmentTimeline.length - 1] ?? null;
    const cohortsCovered = new Set(roster.map((student) => student.cohortName).filter(Boolean)).size;
    const podsCovered = new Set(roster.map((student) => student.podLabel).filter(Boolean)).size;
    const loadBand = roster.length >= 18 ? 'High load' : roster.length >= 10 ? 'Balanced load' : 'Light load';
    const supportBand = mallam.summary.watchCount >= 4 ? 'Escalate coaching support' : mallam.summary.watchCount >= 2 ? 'Targeted follow-up' : 'Routine coaching';
    const assignmentPace = assignments.length >= 4 ? 'Heavy delivery window' : assignments.length >= 2 ? 'Steady delivery window' : 'Light delivery window';
    const rosterMomentum = stableLearners.length > watchLearners.length ? 'Roster is mostly stable' : 'Roster is carrying visible risk';
    const attendanceSpread = {
      best: roster.length ? Math.max(...roster.map((student) => student.attendanceRate)) : 0,
      worst: roster.length ? Math.min(...roster.map((student) => student.attendanceRate)) : 0,
      average: average(roster.map((student) => student.attendanceRate)),
    };

    return (
      <PageShell
        title={mallam.displayName}
        subtitle="Mallam deployment detail with actual history depth: roster pressure, assignment timeline, learner risk spread, and coaching signals instead of a skinny profile card."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Mallams', href: '/mallams' },
          { label: mallam.displayName },
        ]}
      >
        <FeedbackBanner message={query?.message} />
        <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
          <Card title={String(mallam.summary.rosterCount)} eyebrow="Roster"><div style={{ color: '#64748b' }}>Learners directly mapped to this mallam.</div></Card>
          <Card title={String(mallam.summary.activeAssignments)} eyebrow="Active assignments"><div style={{ color: '#64748b' }}>Delivery blocks owned in the current window.</div></Card>
          <Card title={`${Math.round(mallam.summary.averageAttendance * 100)}%`} eyebrow="Avg attendance"><div style={{ color: '#64748b' }}>Across the current roster, not just the neat cases.</div></Card>
          <Card title={String(mallam.summary.watchCount)} eyebrow="Watchlist"><div style={{ color: '#64748b' }}>Learners needing tighter coaching support.</div></Card>
        </section>

        <section style={{ ...responsiveGrid(280), marginBottom: 20 }}>
          <Card title="Deployment profile" eyebrow="Readiness">
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Center', mallam.centerName ?? '—'],
                ['Region', mallam.region],
                ['Role', mallam.role],
                ['Certification', mallam.certificationLevel],
                ['Languages', mallam.languages?.join(', ') ?? '—'],
                ['Pods', mallam.podLabels.join(', ') || '—'],
                ['Cohorts covered', String(cohortsCovered)],
                ['Roster mix', levelsInRoster.join(' • ') || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ paddingBottom: 12, borderBottom: '1px solid #eef2f7' }}><span style={{ color: '#64748b' }}>{label}</span><div style={{ fontWeight: 800, marginTop: 4 }}>{value}</div></div>
              ))}
            </div>
          </Card>

          <Card title="Operating readout" eyebrow="What this history says">
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Load posture', `${loadBand} across ${podsCovered || mallam.summary.podCoverage} pod${(podsCovered || mallam.summary.podCoverage) === 1 ? '' : 's'}`],
                ['Support posture', `${supportBand} with ${mallam.summary.watchCount} learner${mallam.summary.watchCount === 1 ? '' : 's'} flagged`],
                ['Delivery pace', assignmentPace],
                ['Roster momentum', rosterMomentum],
              ].map(([label, detail]) => (
                <div key={label} style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recommended actions" eyebrow="Coach the operator">
            <div style={{ display: 'grid', gap: 10 }}>
              {mallam.recommendedActions.map((action) => (
                <div key={action} style={{ padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc' }}>{action}</div>
              ))}
              {nextAssignment ? (
                <div style={{ padding: 14, borderRadius: 14, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730A3' }}>
                  Next delivery checkpoint: <strong>{nextAssignment.lessonTitle}</strong> due {formatDate(nextAssignment.dueDate)}.
                </div>
              ) : null}
            </div>
          </Card>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <Card title="Roster detail" eyebrow="Learner ownership">
              <SimpleTable
                columns={['Learner', 'Cohort', 'Pod', 'Attendance', 'Level', 'Signal']}
                rows={roster.map((student) => {
                  const signal = student.attendanceRate < 0.85 ? 'Needs intervention' : student.attendanceRate >= 0.9 ? 'Stable' : 'Monitor';
                  return [
                    student.name,
                    student.cohortName ?? '—',
                    student.podLabel ?? '—',
                    `${Math.round(student.attendanceRate * 100)}%`,
                    `${student.level} · ${student.stage}`,
                    signal,
                  ];
                })}
              />
            </Card>

            <MallamRosterManager mallam={mallam} roster={roster} candidateLearners={candidateLearners} mallams={allMallams} returnPath={`/mallams/${mallam.id}`} />
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <Card title="Attendance spread" eyebrow="History snapshot">
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  ['Best learner attendance', `${Math.round(attendanceSpread.best * 100)}%`],
                  ['Average learner attendance', `${Math.round(attendanceSpread.average * 100)}%`],
                  ['Lowest learner attendance', `${Math.round(attendanceSpread.worst * 100)}%`],
                  ['Stable learners', String(stableLearners.length)],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottom: '1px solid #eef2f7' }}>
                    <span style={{ color: '#64748b' }}>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Learners needing follow-up first" eyebrow="Risk queue">
              <div style={{ display: 'grid', gap: 10 }}>
                {watchLearners.length ? watchLearners
                  .sort((left, right) => left.attendanceRate - right.attendanceRate)
                  .slice(0, 5)
                  .map((student) => (
                    <div key={student.id} style={{ padding: 14, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                        <strong>{student.name}</strong>
                        <span style={{ color: '#9a3412', fontWeight: 800 }}>{Math.round(student.attendanceRate * 100)}%</span>
                      </div>
                      <div style={{ color: '#64748b', lineHeight: 1.6 }}>{student.cohortName ?? 'No cohort'} • {student.podLabel ?? 'No pod'} • {student.level} · {student.stage}</div>
                    </div>
                  )) : (
                    <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                      No learner is currently below the attendance watch threshold. Nice. Keep it that way.
                    </div>
                  )}
              </div>
            </Card>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card title="Assignment timeline" eyebrow="Recent and upcoming delivery history">
            <div style={{ display: 'grid', gap: 12 }}>
              {assignmentTimeline.length ? assignmentTimeline.map((assignment) => {
                const tone = assignmentTone(assignment.status);
                return (
                  <div key={assignment.id} style={{ padding: 16, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <strong>{assignment.lessonTitle}</strong>
                      <Pill label={assignment.status} tone={tone.tone} text={tone.text} />
                    </div>
                    <div style={{ color: '#64748b', marginTop: 6, lineHeight: 1.6 }}>{assignment.cohortName} • {assignment.podLabel ?? 'No pod'} • due {formatDate(assignment.dueDate)}</div>
                    <div style={{ color: '#64748b', marginTop: 4 }}>Assessment: {assignment.assessmentTitle ?? 'None attached'}</div>
                  </div>
                );
              }) : (
                <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                  No assignment history is attached to this mallam yet.
                </div>
              )}
            </div>
          </Card>

          <Card title="History summary" eyebrow="Useful before a review call">
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Most recent assignment', recentAssignment ? `${recentAssignment.lessonTitle} · ${formatDate(recentAssignment.dueDate)}` : 'No recorded assignments yet'],
                ['Upcoming assignment', nextAssignment ? `${nextAssignment.lessonTitle} · ${formatDate(nextAssignment.dueDate)}` : 'No future assignment in the queue'],
                ['Pod coverage', `${podsCovered || mallam.summary.podCoverage} live pod${(podsCovered || mallam.summary.podCoverage) === 1 ? '' : 's'}`],
                ['Readiness lift', `${mallam.summary.readinessCount} learner${mallam.summary.readinessCount === 1 ? '' : 's'} ready to progress`],
              ].map(([label, detail]) => (
                <div key={label} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
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
