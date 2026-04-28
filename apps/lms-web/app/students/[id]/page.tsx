import { notFound } from 'next/navigation';
import { DeleteStudentForm, UpdateStudentForm } from '../../../components/admin-forms';
import { LearnerMallamAssignmentForm } from '../../../components/learner-mallam-assignment-form';
import { ModalLauncher } from '../../../components/modal-launcher';
import { fetchCenters, fetchCohorts, fetchLocalGovernments, fetchMallams, fetchPods, fetchStates, fetchStudent } from '../../../lib/api';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../../lib/ui';

function percent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatRewardKind(value: string | null | undefined) {
  if (!value) return 'Reward update';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [studentResult, cohortsResult, podsResult, mallamsResult, centersResult, statesResult, localGovernmentsResult] = await Promise.allSettled([
    fetchStudent(id),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
    fetchCenters(),
    fetchStates(),
    fetchLocalGovernments(),
  ]);

  const student = studentResult.status === 'fulfilled' ? studentResult.value : null;
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];
  const centers = centersResult.status === 'fulfilled' ? centersResult.value : [];
  const states = statesResult.status === 'fulfilled' ? statesResult.value : [];
  const localGovernments = localGovernmentsResult.status === 'fulfilled' ? localGovernmentsResult.value : [];

  const failedSources = [
    studentResult.status === 'rejected' ? 'student detail' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
    centersResult.status === 'rejected' ? 'centers' : null,
    statesResult.status === 'rejected' ? 'states' : null,
    localGovernmentsResult.status === 'rejected' ? 'local governments' : null,
  ].filter(Boolean) as string[];

  if (!student) notFound();

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
                { label: 'Earned points', value: String(student.rewards?.points ?? student.rewards?.totalXp ?? 0) },
                { label: 'Badges', value: String(student.rewards?.badgesUnlocked ?? 0) },
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
              <Pill label={`${student.rewards?.points ?? student.rewards?.totalXp ?? 0} pts`} tone="#FEF3C7" text="#92400E" />
              <Pill label={`${student.rewards?.badgesUnlocked ?? 0} badge${(student.rewards?.badgesUnlocked ?? 0) === 1 ? '' : 's'}`} tone="#FDF2F8" text="#9D174D" />
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
                { label: 'Earned points', value: String(student.rewards?.points ?? student.rewards?.totalXp ?? 0) },
                { label: 'Reward level', value: student.rewards?.levelLabel ? `Level ${student.rewards.level} · ${student.rewards.levelLabel}` : '—' },
                { label: 'Next level in', value: `${student.rewards?.xpForNextLevel ?? 0} pts` },
                { label: 'Badges unlocked', value: String(student.rewards?.badgesUnlocked ?? 0) },
              ]}
            />
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: '#475569', fontSize: 14 }}>
                <span>Progress to next reward level</span>
                <strong style={{ color: '#0f172a' }}>{Math.round((student.rewards?.progressToNextLevel ?? 0) * 100)}%</strong>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((student.rewards?.progressToNextLevel ?? 0) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #F59E0B)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#64748b', fontWeight: 800 }}>Recent reward activity</div>
              {student.rewards?.recentTransactions?.length ? student.rewards.recentTransactions.slice(0, 5).map((transaction) => (
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
