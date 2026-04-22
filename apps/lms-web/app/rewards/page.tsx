import Link from 'next/link';
import { fetchRewardRequests, fetchRewardsCatalog, fetchRewardsLeaderboard } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

export default async function RewardsPage() {
  const [catalog, leaderboard, requests] = await Promise.all([
    fetchRewardsCatalog(),
    fetchRewardsLeaderboard(8),
    fetchRewardRequests(12),
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

      <Card title="Reward request queue" eyebrow="Operations">
        <SimpleTable
          columns={['Learner', 'Reward', 'Status', 'XP cost', 'Requested via', 'Actions']}
          rows={(requests.items || []).map((item) => [
            item.learnerName || item.studentId,
            item.rewardTitle,
            <Pill key={`${item.id}-status`} label={item.status} tone="#F8FAFC" text="#334155" />,
            String(item.xpCost || 0),
            item.requestedVia || '—',
            <Link key={`${item.id}-link`} href="/settings" style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>
              Review policy
            </Link>,
          ])}
        />
      </Card>
    </PageShell>
  );
}
