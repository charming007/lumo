import { RewardRequestQueuePanel } from '../../components/reward-request-queue-panel';
import { RewardsAdminForm } from '../../components/rewards-admin-form';
import { fetchRewardRequests, fetchRewardsCatalog, fetchRewardsLeaderboard, fetchStudents } from '../../lib/api';
import type { RewardSnapshot, RewardRequestQueue, Student } from '../../lib/types';
import type { RewardCatalog } from '../../lib/rewards';
import { Card, MetricList, PageShell, Pill, responsiveGrid } from '../../lib/ui';

const emptyCatalog: RewardCatalog = {
  xpRules: {},
  levels: [],
  badges: [],
};

const emptyRequestQueue: RewardRequestQueue = {
  items: [],
  summary: {
    total: 0,
    pending: 0,
    approved: 0,
    fulfilled: 0,
    rejected: 0,
    cancelled: 0,
    expired: 0,
    attentionCount: 0,
    urgentCount: 0,
    averageAgeDays: 0,
  },
  meta: {
    count: 0,
    returned: 0,
  },
};

export default async function RewardsPage() {
  const [catalogResult, leaderboardResult, requestsResult, studentsResult] = await Promise.allSettled([
    fetchRewardsCatalog(),
    fetchRewardsLeaderboard(8),
    fetchRewardRequests(12),
    fetchStudents(),
  ]);

  const catalog: RewardCatalog = catalogResult.status === 'fulfilled' ? catalogResult.value : emptyCatalog;
  const leaderboard: RewardSnapshot[] = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
  const requests: RewardRequestQueue = requestsResult.status === 'fulfilled' ? requestsResult.value : emptyRequestQueue;
  const students: Student[] = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const failedSources = [
    catalogResult.status === 'rejected' ? 'reward catalog' : null,
    leaderboardResult.status === 'rejected' ? 'leaderboard' : null,
    requestsResult.status === 'rejected' ? 'reward requests' : null,
    studentsResult.status === 'rejected' ? 'students' : null,
  ].filter(Boolean) as string[];
  const hasCoreRewardsGap = catalogResult.status === 'rejected' || requestsResult.status === 'rejected';

  return (
    <PageShell
      title="Rewards"
      subtitle="Monitor XP momentum, pending reward requests, and top learner progression without dropping into Settings or hiding the queue."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Rewards snapshot" eyebrow="Live API">
          <MetricList
            items={[
              { label: 'Catalog badges', value: String(catalog.badges?.length || 0) },
              { label: 'Pending requests', value: String(requests.summary?.pending || 0) },
              { label: 'Leaderboard rows', value: String(leaderboard.length) },
            ]}
          />
        </Card>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 16, background: hasCoreRewardsGap ? '#fef2f2' : '#fff7ed', border: `1px solid ${hasCoreRewardsGap ? '#fecaca' : '#fed7aa'}`, color: hasCoreRewardsGap ? '#b91c1c' : '#9a3412', lineHeight: 1.6, fontWeight: 700 }}>
          {hasCoreRewardsGap
            ? `Rewards admin is degraded because the ${failedSources.join(', ')} feed${failedSources.length === 1 ? ' has' : 's have'} failed. The page stays visible so operators can see the outage instead of eating a 500, but reward issuance and request triage are not trustworthy until those feeds recover.`
            : `Rewards admin recovered with degraded feeds: ${failedSources.join(', ')}. Core reward controls stay visible, but leaderboard context may be incomplete until those feeds recover.`}
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(280), marginBottom: 20 }}>
        {leaderboard.slice(0, 3).map((learner) => (
          <Card key={learner.learnerId} title={learner.learnerName || learner.learnerId} eyebrow={`Level ${learner.level}`}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={`${learner.totalXp} XP`} tone="#EEF2FF" text="#3730A3" />
                <Pill label={`${learner.badgesUnlocked} badges`} tone="#FEF3C7" text="#92400E" />
              </div>
              <div style={{ color: '#475569', lineHeight: 1.6 }}>
                {learner.levelLabel}<br />
                Progress to next: <strong>{Math.round(learner.progressToNextLevel || 0)}%</strong>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <RewardsAdminForm students={students} catalog={catalog} leaderboard={leaderboard} />
      </section>

      <RewardRequestQueuePanel queue={requests} />
    </PageShell>
  );
}
