import { CreateStudentForm, DeleteStudentForm, UpdateStudentForm } from '../../components/admin-forms';
import { DeploymentBlockerCard } from '../../components/deployment-blocker-card';
import { FeedbackBanner } from '../../components/feedback-banner';
import { ModalLauncher } from '../../components/modal-launcher';
import { fetchCohorts, fetchMallams, fetchPods, fetchStudents, fetchWorkboard } from '../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../lib/config';
import { Card, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

function tone(status: string) {
  if (status === 'ready') return ['#DCFCE7', '#166534'] as const;
  if (status === 'watch') return ['#FEF3C7', '#92400E'] as const;
  return ['#E0E7FF', '#3730A3'] as const;
}

const actionButtonStyle = {
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 13,
  fontWeight: 700,
  boxShadow: 'none',
};

export default async function StudentsPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Learners"
        subtitle="Production wiring is incomplete, so the learner roster is blocked instead of pretending ownership, attendance, and progression data are trustworthy."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: learner roster API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} learner roster counts, attendance risk flags, progression readiness, and add/edit/delete learner actions would all degrade into polished nonsense. Fix the env var, redeploy, then verify live learner data before touching roster operations.
          </>
        )}
        whyBlocked={[
          'This page is not a passive readout. It drives learner creation, reassignment, deletion, and progression follow-up, so a disconnected “empty roster” state is operationally dangerous.',
          'Without the production API base, mallam ownership, pod placement, attendance watchlists, and readiness signals can all look calm while the backend is actually dead.',
          'Blocking here stops reviewers from mistaking a glossy roster shell for a live admin surface.',
        ]}
        verificationItems={[
          {
            surface: 'Learner roster',
            expected: 'Live learners load with cohort, mallam, pod, attendance, and stage data from production',
            failure: 'Empty roster or placeholder counts that imply no learners exist',
          },
          {
            surface: 'Roster operations',
            expected: 'Add, edit, and delete actions only appear once cohorts, pods, mallams, and learner records are live',
            failure: 'Operators can open roster actions while dependency feeds are missing',
          },
          {
            surface: 'Support queue',
            expected: 'Progression readiness and watchlist rows match the live workboard feed',
            failure: 'Ready/watch counts look clean while the workboard is actually disconnected',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Attendance blocker', href: '/attendance', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Reports blocker', href: '/reports', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const query = await searchParams;
  const [studentsResult, workboardResult, cohortsResult, podsResult, mallamsResult] = await Promise.allSettled([
    fetchStudents(),
    fetchWorkboard(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
  ]);

  const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const workboard = workboardResult.status === 'fulfilled' ? workboardResult.value : [];
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];

  const failedSources = [
    { label: 'learners', result: studentsResult },
    { label: 'workboard', result: workboardResult },
    { label: 'cohorts', result: cohortsResult },
    { label: 'pods', result: podsResult },
    { label: 'mallams', result: mallamsResult },
  ].filter((entry) => entry.result.status === 'rejected').map((entry) => entry.label);
  const criticalRosterFailures = [
    studentsResult.status !== 'fulfilled' ? 'learners' : null,
    workboardResult.status !== 'fulfilled' ? 'workboard' : null,
    cohortsResult.status !== 'fulfilled' ? 'cohorts' : null,
    podsResult.status !== 'fulfilled' ? 'pods' : null,
    mallamsResult.status !== 'fulfilled' ? 'mallams' : null,
  ].filter(Boolean) as string[];
  const hasCriticalRosterGap = criticalRosterFailures.length > 0;

  if (hasCriticalRosterGap) {
    return (
      <DeploymentBlockerCard
        title="Learners"
        subtitle="The learner roster is blocked until the live roster, workboard, and dependency feeds all load cleanly from production."
        blockerHeadline="Deployment blocker: learner roster live feeds are degraded."
        blockerDetail={(
          <>
            The learner admin surface is missing <code style={{ color: 'white', fontWeight: 900 }}>{criticalRosterFailures.join(', ')}</code> data right now. Showing an empty roster or partial ownership graph here would invite bad learner moves, fake calm watchlists, and broken intervention decisions.
          </>
        )}
        whyBlocked={[
          'This route can create, edit, reassign, and delete learners. Partial data here is worse than a crash because it looks trustworthy while key ownership feeds are missing.',
          'Learner progression follow-up depends on the workboard plus live cohort, pod, and mallam context. If any of those are down, roster decisions become guesswork.',
          'Deployment review should fail loudly when the roster backbone is degraded instead of letting a blank table masquerade as “no learners need attention.”',
        ]}
        verificationItems={[
          {
            surface: 'Learner roster feed',
            expected: 'Live learners load with cohort, mallam, pod, attendance, and stage context',
            failure: 'Empty or partial roster that hides missing learner records behind a calm table shell',
          },
          {
            surface: 'Learner support queue',
            expected: 'Ready/watch learners match the live workboard feed',
            failure: 'Progression queue disappears or shrinks because the workboard feed is down',
          },
          {
            surface: 'Roster dependencies',
            expected: 'Cohorts, pods, and mallams all load before learner operations become available',
            failure: `Missing dependency feeds such as ${criticalRosterFailures.join(', ')}`,
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Attendance blocker', href: '/attendance', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
          { label: 'Reports blocker', href: '/reports', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const rosterDependenciesReady = cohorts.length > 0 && pods.length > 0 && mallams.length > 0;
  const flaggedLearners = students.filter((student) => student.attendanceRate < 0.85).length;

  return (
    <PageShell
      title="Learners"
      subtitle="Roster operations, assignment/reassignment, and readiness signals for the live admin desk."
      aside={
        rosterDependenciesReady ? (
          <ModalLauncher
            buttonLabel="Add Student"
            title="Add learner"
            description="Create a new learner without leaving the roster view."
          >
            <CreateStudentForm cohorts={cohorts} pods={pods} mallams={mallams} />
          </ModalLauncher>
        ) : (
          <div style={{ padding: '12px 14px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700, maxWidth: 340 }}>
            Add learner is temporarily unavailable until cohorts, pods, and mallams load.
          </div>
        )
      }
    >
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Learner roster is running in degraded mode: {failedSources.join(', ')} data {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}
      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        {[
          { label: 'Learners live', value: String(students.length), note: 'Across the current operator roster dataset' },
          { label: 'Below attendance comfort zone', value: String(flaggedLearners), note: 'Needs guardian follow-up or scheduling fix' },
          { label: 'Ready to progress', value: String(workboard.filter((item) => item.progressionStatus === 'ready').length), note: 'Good candidates for the next module gate' },
          { label: 'Watchlist', value: String(workboard.filter((item) => item.progressionStatus === 'watch').length), note: 'Keep mallam coaching visible this week' },
        ].map((item) => (
          <Card key={item.label} title={item.value} eyebrow={item.label}>
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>{item.note}</div>
          </Card>
        ))}
      </section>

      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <Card title="Learner roster" eyebrow="Profiles + quick ownership scan">
          <SimpleTable
            columns={['Learner', 'Cohort', 'Mallam', 'Pod', 'Attendance', 'Level', 'Actions']}
            rows={students.length ? students.map((student) => [
              <strong key={student.id}>{student.name}</strong>,
              student.cohortName ?? '—',
              student.mallamName ?? '—',
              student.podLabel ?? '—',
              `${Math.round(student.attendanceRate * 100)}%`,
              `${student.level} · ${student.stage}`,
              <div key={`${student.id}-actions`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href={`/students/${student.id}`} style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>View profile</a>
                {rosterDependenciesReady ? (
                  <ModalLauncher
                    buttonLabel="Edit learner"
                    title={`Edit learner · ${student.name}`}
                    description="Update roster placement, owner, and learner profile details without leaving this list."
                    eyebrow="Edit learner"
                    triggerStyle={{ ...actionButtonStyle, background: '#e6fffb', color: '#0f766e' }}
                  >
                    <UpdateStudentForm student={student} cohorts={cohorts} pods={pods} mallams={mallams} embedded />
                  </ModalLauncher>
                ) : null}
                <ModalLauncher
                  buttonLabel="Delete learner"
                  title={`Delete learner · ${student.name}`}
                  description="Use this only when the learner record should be removed from the active admin roster."
                  eyebrow="Delete learner"
                  triggerStyle={{ ...actionButtonStyle, background: '#fee2e2', color: '#b91c1c' }}
                >
                  <DeleteStudentForm student={student} embedded />
                </ModalLauncher>
              </div>,
            ]) : [[<span key="no-students" style={{ color: '#64748b' }}>Learner roster data is unavailable right now.</span>, '', '', '', '', '', '']]}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', marginBottom: 20 }}>
        <Card title="Learner support queue" eyebrow="Actionable">
          <SimpleTable
            columns={['Learner', 'Focus area', 'Attendance', 'Mastery', 'Progression', 'Next module']}
            rows={workboard.length ? workboard.map((item) => {
              const [pillTone, pillText] = tone(item.progressionStatus);
              return [
                item.studentName,
                item.focus,
                `${Math.round(item.attendanceRate * 100)}%`,
                `${Math.round(item.mastery * 100)}%`,
                <Pill key={item.id} label={item.progressionStatus} tone={pillTone} text={pillText} />,
                item.recommendedNextModuleTitle ?? '—',
              ];
            }) : [[<span key="no-workboard" style={{ color: '#64748b' }}>Workboard data is unavailable right now.</span>, '', '', '', '', '']]}
          />
        </Card>
      </section>
    </PageShell>
  );
}
