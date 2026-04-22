import Link from 'next/link';
import { RewardRequestQueuePanel } from '../../components/reward-request-queue-panel';
import { RewardsAdminForm } from '../../components/rewards-admin-form';
import { fetchRewardRequests, fetchRewardsCatalog, fetchRewardsLeaderboard, fetchStudents } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

export default async function RewardsPage() {
  const [catalog, leaderboard, requests, students] = await Promise.all([
    fetchRewardsCatalog(),
    fetchRewardsLeaderboard(8),
    fetchRewardRequests(12),
    fetchStudents(),
  ]);

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
