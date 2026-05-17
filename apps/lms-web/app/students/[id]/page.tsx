import { notFound } from 'next/navigation';
import { DeleteStudentForm, UpdateStudentForm } from '../../../components/admin-forms';
import { DeploymentBlockerCard } from '../../../components/deployment-blocker-card';
import { LearnerMallamAssignmentForm } from '../../../components/learner-mallam-assignment-form';
import { ModalLauncher } from '../../../components/modal-launcher';
import { fetchCenters, fetchCohorts, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudent, fetchStudentRewards } from '../../../lib/api';
import { API_BASE_DIAGNOSTIC } from '../../../lib/config';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../../lib/ui';

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatRewardKind(value: string | null | undefined) {
  if (!value) return 'Reward update';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function rewardProgressPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized * 100)));
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return (
      <DeploymentBlockerCard
        title="Learner detail"
        subtitle="Production wiring is incomplete, so learner detail is blocked instead of pretending roster, rewards, and routing data are trustworthy."
        blockerHeadline={API_BASE_DIAGNOSTIC.blockerHeadline ?? 'Deployment blocker: learner detail API base URL is unsafe for production.'}
        blockerDetail={(
          <>
            <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code> is missing or unsafe for production. {API_BASE_DIAGNOSTIC.blockerDetail} learner edits, mallam assignment, and reward history would otherwise degrade into misleading fallback states. Fix the env var, redeploy, then verify the live learner detail flow.
          </>
        )}
        whyBlocked={[
          'Learner detail drives real roster edits, assignment routing, and reward visibility. A polished page backed by localhost, placeholder data, or no backend is dangerous theatre.',
          'This route should not imply a learner record is trustworthy until the deployment is pointed at a real production API.',
        ]}
        verificationItems={[
          {
            surface: 'Learner profile',
            expected: 'Live learner, cohort, pod, and mallam fields load from production',
            failure: 'The profile looks editable but the deployment is not connected to the real backend',
          },
          {
            surface: 'Reward activity',
            expected: 'Recent reward transactions and level progress reflect the live rewards feed',
            failure: 'Rewards look empty or generic even though the route still feels production-ready',
          },
        ]}
        docs={[
          { label: 'Dashboard blocker', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Students blocker', href: '/students', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const { id } = await params;
  const [studentResult, studentRewardsResult, cohortsResult, podsResult, mallamsResult, centersResult, statesResult, localGovernmentsResult] = await Promise.allSettled([
    fetchStudent(id),
    fetchStudentRewards(id),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
    fetchCenters(),
    fetchStates(),
    fetchLocalGovernments(),
  ]);

  if (studentResult.status === 'rejected') {
    return (
      <DeploymentBlockerCard
        title="Learner detail"
        subtitle="The learner detail route is blocked because the live learner feed is unavailable, so a fake 404 would be a lie."
        blockerHeadline="Deployment blocker: learner detail feed is unavailable."
        blockerDetail={(
          <>
            The learner detail feed failed before this route could verify the requested learner. Treating a failed learner lookup as “student not found” would hide a live outage behind a fake 404.
          </>
        )}
        whyBlocked={[
          'Learner detail cannot distinguish “record missing” from “backend unavailable” if the core learner fetch failed outright.',
          'Operators should see an honest outage blocker, not lose the route behind a misleading not-found screen.',
        ]}
        verificationItems={[
          {
            surface: 'Learner detail route',
            expected: 'Requested learner record loads before detail UI renders',
            failure: 'The route drops into 404 even though the learner API is degraded',
          },
          {
            surface: 'Learner actions',
            expected: 'Edit, delete, assignment, and rewards UI only appear when the core learner record is trustworthy',
            failure: 'Operators can act on a detail shell that never proved the learner exists',
          },
        ]}
        docs={[
          { label: 'Students overview', href: '/students', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Dashboard', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
        ]}
      />
    );
  }

  const student = studentResult.value;
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const centers = centersResult.status === 'fulfilled' ? centersResult.value : [];
  const states = statesResult.status === 'fulfilled' ? statesResult.value : [];
  const localGovernments = localGovernmentsResult.status === 'fulfilled' ? localGovernmentsResult.value : [];

  const failedSources = [
    studentRewardsResult.status === 'rejected' ? 'canonical rewards snapshot' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];
  const criticalLearnerDetailFailures = [
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];

  if (!student) notFound();

  if (criticalLearnerDetailFailures.length) {
    const blockerDetail = criticalLearnerDetailFailures.length === 1
      ? `The ${criticalLearnerDetailFailures[0]} feed failed to load from the live API. Leaving learner detail up would let operators edit roster, geography, or mallam routing while the reference graph is blind.`
      : `The ${criticalLearnerDetailFailures.join(', ')} feeds failed to load from the live API. Leaving learner detail up would let operators edit roster, geography, or mallam routing while the reference graph is blind.`;

    return (
      <DeploymentBlockerCard
        title="Learner detail"
        subtitle="Learner detail is a live roster write surface, not a harmless profile page. If the core roster-reference feeds are down, the route should block instead of inviting blind edits."
        blockerHeadline="Deployment blocker: learner detail roster-reference feeds are degraded."
        blockerDetail={(
          <>
            {blockerDetail} {failedSources.length > criticalLearnerDetailFailures.length
              ? `Additional degraded feed${failedSources.length - criticalLearnerDetailFailures.length === 1 ? '' : 's'}: ${failedSources.filter((source) => !criticalLearnerDetailFailures.includes(source)).join(', ')}.`
              : ''}
          </>
        )}
        whyBlocked={[
          'Operators use this route to edit learner profiles, change pod or mallam routing, and manage deletion decisions. If cohorts, pods, mallams, centers, states, or local governments disappear, the detail form stops being trustworthy.',
          'Reward history can degrade separately as supporting context, but learner detail should stop cold when the core roster-reference graph is missing.',
        ]}
        verificationItems={[
          {
            surface: 'Learner detail profile',
            expected: 'Cohort, pod, mallam, center, state, and local government references all load before the learner detail form is trusted',
            failure: 'Edit controls remain reachable while the roster-reference graph is missing or stale',
          },
          {
            surface: 'Roster routing decisions',
            expected: 'Mallam assignment and learner geography updates reflect the live backend before operators move anyone',
            failure: 'The route implies learner routing updates are safe while the geography or ownership graph is degraded',
          },
        ]}
        docs={[
          { label: 'Students overview', href: '/students', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
          { label: 'Dashboard', href: '/', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
          { label: 'Settings blocker', href: '/settings', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' },
        ]}
      />
    );
  }

  const rewards = studentRewardsResult.status === 'fulfilled'
    ? { ...studentRewardsResult.value, learnerName: studentRewardsResult.value.learnerName || student.name }
    : student.rewards;
  const progressPercent = rewardProgressPercent(rewards?.progressToNextLevel);

  return (
    <PageShell
      title={student.name}
      subtitle="Learner admin detail for roster edits, pod routing, and deletion controls."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Students', href: '/students' }]}
      aside={
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <ModalLauncher
              buttonLabel="✏️ Edit learner"
              title={`Edit ${student.name}`}
              description="Update learner details from a focused popup instead of a giant inline form."
              eyebrow="Learner admin"
              triggerStyle={{ borderRadius: 14, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', boxShadow: 'none' }}
            >
              <UpdateStudentForm student={student} cohorts={cohorts} pods={pods} mallams={mallams} centers={centers} states={states} localGovernments={localGovernments} />
            </ModalLauncher>
            <ModalLauncher
              buttonLabel="🗑️ Delete learner"
              title={`Delete ${student.name}`}
              description="Remove this learner from the live roster carefully."
              eyebrow="Danger zone"
              triggerStyle={{ borderRadius: 14, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', boxShadow: 'none' }}
            >
              <DeleteStudentForm student={student} />
            </ModalLauncher>
          </div>
          <Card title="Learner snapshot" eyebrow="Roster health">
            <MetricList
              items={[
                { label: 'Level', value: student.level || '—' },
                { label: 'Stage', value: student.stage || '—' },
                { label: 'Attendance', value: percent(student.attendanceRate) },
                { label: 'Pod', value: student.podLabel || 'Unassigned' },
                { label: 'Earned points', value: String(rewards?.points ?? rewards?.totalXp ?? 0) },
                { label: 'Badges', value: String(rewards?.badgesUnlocked ?? 0) },
              ]}
            />
          </Card>
        </div>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          Learner detail recovered with degraded feeds: {failedSources.join(', ')}. Core learner record is still loaded, but edit forms and assignment selectors may have reduced geography or roster context until those feeds recover.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Learner profile" eyebrow={student.cohortName || 'Learner'}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={student.level || 'Unknown'} tone="#EEF2FF" text="#3730A3" />
              <Pill label={student.stage || 'Unknown stage'} tone="#ECFDF5" text="#166534" />
              <Pill label={`${rewards?.points ?? rewards?.totalXp ?? 0} pts`} tone="#FEF3C7" text="#92400E" />
              <Pill label={`${rewards?.badgesUnlocked ?? 0} badge${(rewards?.badgesUnlocked ?? 0) === 1 ? '' : 's'}`} tone="#FDF2F8" text="#9D174D" />
            </div>
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              Age: <strong>{student.age || '—'}</strong><br />
              Guardian: <strong>{student.guardianName || '—'}</strong><br />
              Device access: <strong>{student.deviceAccess || '—'}</strong><br />
              Mallam: <strong>{student.mallamName || 'Derived from pod once assigned'}</strong>
            </div>
          </div>
        </Card>
        <Card title="Reward progress" eyebrow="Live learner rewards">
          <div style={{ display: 'grid', gap: 14 }}>
            <MetricList
              items={[
                { label: 'Earned points', value: String(rewards?.points ?? rewards?.totalXp ?? 0) },
                { label: 'Reward level', value: rewards?.levelLabel ? `Level ${rewards.level} · ${rewards.levelLabel}` : '—' },
                { label: 'Next level in', value: `${rewards?.xpForNextLevel ?? 0} pts` },
                { label: 'Badges unlocked', value: String(rewards?.badgesUnlocked ?? 0) },
              ]}
            />
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: '#475569', fontSize: 14 }}>
                <span>Progress to next reward level</span>
                <strong style={{ color: '#0f172a' }}>{progressPercent}%</strong>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #F59E0B)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800 }}>Recent reward activity</div>
              {rewards?.recentTransactions?.length ? rewards.recentTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} style={{ borderRadius: 14, border: '1px solid #E2E8F0', padding: '12px 14px', display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#0f172a' }}>{transaction.label || formatRewardKind(transaction.kind)}</strong>
                    <span style={{ color: transaction.xpDelta >= 0 ? '#166534' : '#B91C1C', fontWeight: 800 }}>{transaction.xpDelta >= 0 ? '+' : ''}{transaction.xpDelta} pts</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>
                    {formatRewardKind(transaction.kind)}{transaction.createdAt ? ` · ${new Date(transaction.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
                  </div>
                </div>
              )) : <div style={{ color: '#64748b', lineHeight: 1.6 }}>No reward transactions yet. Tablet-earned lesson completions and admin adjustments will appear here from the same live reward feed.</div>}
            </div>
          </div>
        </Card>
        <LearnerMallamAssignmentForm student={student} pods={pods} returnPath={`/students/${student.id}`} />
      </section>

    </PageShell>
  );
}
