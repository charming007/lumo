import Link from 'next/link';
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

export default async function MallamDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;

  try {
    const [mallamResult, studentsResult, mallamsResult] = await Promise.allSettled([fetchMallam(id), fetchStudents(), fetchMallams()]);
    if (mallamResult.status === 'rejected') notFound();

    const mallam = mallamResult.value;
    const allStudents = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
    const allMallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
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
    const reportDrilldownHref = `/reports?mallam=${encodeURIComponent(mallam.id)}`;
    const assignmentDrilldownHref = `/assignments?mallam=${encodeURIComponent(mallam.id)}`;
    const fieldNarrative = `${mallam.displayName} is carrying ${roster.length} learner${roster.length === 1 ? '' : 's'} across ${podsCovered || mallam.summary.podCoverage} pod${(podsCovered || mallam.summary.podCoverage) === 1 ? '' : 's'}, with average attendance at ${Math.round(mallam.summary.averageAttendance * 100)}% and ${mallam.summary.watchCount} learner${mallam.summary.watchCount === 1 ? '' : 's'} on watch. ${nextAssignment ? `Next visible checkpoint is ${nextAssignment.lessonTitle} due ${formatDate(nextAssignment.dueDate)}.` : 'No future assignment checkpoint is attached yet, so delivery planning still needs upstream cleanup.'}`;

    return (
      <PageShell
        title={mallam.displayName}
        subtitle="Mallam deployment detail with actual history depth: roster pressure, assignment timeline, learner risk spread, and coaching signals instead of a skinny profile card."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Mallams', href: '/mallams' },
          { label: mallam.displayName },
        ]}
        aside={(
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href={reportDrilldownHref} style={{ borderRadius: 14, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
              Open reporting view
            </Link>
            <Link href={assignmentDrilldownHref} style={{ borderRadius: 14, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
              Review assignments
            </Link>
          </div>
        )}
      >
        <FeedbackBanner message={query?.message} />
        {studentsResult.status === 'rejected' || mallamsResult.status === 'rejected' ? (
          <div style={{ marginBottom: 16 }}>
            {sectionAlert(
              [
                studentsResult.status === 'rejected' ? 'learner roster feed' : null,
                mallamsResult.status === 'rejected' ? 'mallam directory feed' : null,
              ].filter(Boolean).join(' + ') + ' failed. Mallam detail still loads, but roster operations are partially unavailable.',
              'warning',
            )}
          </div>
        ) : null}
        <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
          <Card title={String(mallam.summary.rosterCount)} eyebrow="Roster"><div style={{ color: '#64748b' }}>Learners directly mapped to this mallam.</div></Card>
          <Card title={String(mallam.summary.activeAssignments)} eyebrow="Active assignments"><div style={{ color: '#64748b' }}>Delivery blocks owned in the current window.</div></Card>
          <Card title={`${Math.round(mallam.summary.averageAttendance * 100)}%`} eyebrow="Avg attendance"><div style={{ color: '#64748b' }}>Across the current roster, not just the neat cases.</div></Card>
          <Card title={String(mallam.summary.watchCount)} eyebrow="Watchlist"><div style={{ color: '#64748b' }}>Learners needing tighter coaching support.</div></Card>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16, marginBottom: 20 }}>
          <Card title="Operator handoff" eyebrow="Use this before a coaching or donor call">
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Roster reality', `${mallam.displayName} is carrying ${roster.length} learner${roster.length === 1 ? '' : 's'} across ${podsCovered || mallam.summary.podCoverage} pod${(podsCovered || mallam.summary.podCoverage) === 1 ? '' : 's'}.`],
                ['Immediate risk', watchLearners.length ? `${watchLearners.length} learner${watchLearners.length === 1 ? '' : 's'} are below the attendance watch threshold and should be the first coaching conversation.` : 'No learner is currently below the attendance watch threshold. That is rare; don’t waste it.'],
                ['Delivery pressure', nextAssignment ? `Next checkpoint is ${nextAssignment.lessonTitle} due ${formatDate(nextAssignment.dueDate)} with ${assignments.length} assignment${assignments.length === 1 ? '' : 's'} in the visible window.` : 'No future assignment checkpoint is attached yet, so delivery planning still needs cleanup upstream.'],
              ].map(([title, detail]) => (
                <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                  <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Cross-route actions" eyebrow="Don’t make operators bounce blind">
            <div style={{ display: 'grid', gap: 12 }}>
              <Link href={reportDrilldownHref} style={{ padding: 14, borderRadius: 16, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none', fontWeight: 700 }}>
                Open reports scoped to {mallam.displayName} →
              </Link>
              <Link href={assignmentDrilldownHref} style={{ padding: 14, borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', textDecoration: 'none', fontWeight: 700 }}>
                Review assignment queue →
              </Link>
              <div style={{ padding: 14, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', lineHeight: 1.6 }}>
                Mallam detail now has a cleaner handoff: roster pressure here, reporting depth in reports, delivery cleanup in assignments. No more dead-end profile route.
              </div>
            </div>
          </Card>
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

            {studentsResult.status === 'fulfilled' && mallamsResult.status === 'fulfilled' ? (
              <MallamRosterManager mallam={mallam} roster={roster} candidateLearners={candidateLearners} mallams={allMallams} returnPath={`/mallams/${mallam.id}`} />
            ) : (
              <Card title="Roster operations" eyebrow="Temporarily unavailable">
                {sectionAlert('Roster reassignment controls are paused until the learner roster and mallam directory feeds recover.', 'warning')}
              </Card>
            )}
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


          <Card title="Field narrative" eyebrow="Use this in a handoff or supervision note">
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ padding: 16, borderRadius: 18, background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#3730A3', lineHeight: 1.7 }}>
                {fieldNarrative}
              </div>
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                This is the short version ops can paste into a supervision update without re-reading the whole profile.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href={reportDrilldownHref} style={{ color: '#4F46E5', fontWeight: 800, textDecoration: 'none' }}>
                  Open scoped report →
                </Link>
                <Link href="/guide#mallam-ops" style={{ color: '#7C3AED', fontWeight: 800, textDecoration: 'none' }}>
                  Mallam ops guide →
                </Link>
              </div>
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
