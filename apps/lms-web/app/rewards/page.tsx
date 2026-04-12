import Link from 'next/link';
import { fetchRewardsCatalog, fetchRewardsLeaderboard, fetchWorkboard } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import type { RewardCatalog } from '../../lib/rewards';
import type { RewardSnapshot, WorkboardItem } from '../../lib/types';

const EMPTY_CATALOG: RewardCatalog = {
  xpRules: {},
  levels: [],
  badges: [],
};

function statusTone(status: string) {
  if (status === 'ready') return { tone: '#DCFCE7', text: '#166534' };
  if (status === 'watch') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}

function badgeProgressLabel(snapshot: RewardSnapshot, badgeId: string) {
  const badge = snapshot.badges.find((item) => item.id === badgeId);
  if (!badge) return 'No learner progress yet';
  if (badge.earned) return 'Unlocked';
  return `${Math.min(badge.progress, badge.target)}/${badge.target} progress`;
}

export default async function RewardsPage() {
  const [catalogResult, leaderboardResult, workboardResult] = await Promise.allSettled([
    fetchRewardsCatalog(),
    fetchRewardsLeaderboard(12),
    fetchWorkboard(),
  ]);

  const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : EMPTY_CATALOG;
  const leaderboard: RewardSnapshot[] = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
  const workboard: WorkboardItem[] = workboardResult.status === 'fulfilled' ? workboardResult.value : [];

  const failedSources = [
    catalogResult.status === 'rejected' ? 'reward catalog' : null,
    leaderboardResult.status === 'rejected' ? 'leaderboard' : null,
    workboardResult.status === 'rejected' ? 'progression workboard' : null,
  ].filter(Boolean);

  const highestLevel = leaderboard.length ? Math.max(...leaderboard.map((item) => item.level)) : 0;
  const totalXp = leaderboard.reduce((sum, item) => sum + item.totalXp, 0);
  const totalBadges = leaderboard.reduce((sum, item) => sum + item.badgesUnlocked, 0);
  const readyLearners = workboard.filter((item) => item.progressionStatus === 'ready').length;

  return (
    <PageShell
      title="Rewards & Progression"
      subtitle="The admin surface for XP rules, levels, badges, and the learners who are actually moving — not just collecting decorative points."
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/settings" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open ops control center
          </Link>
          <Link href="/english" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#4F46E5', color: 'white', textDecoration: 'none' }}>
            Open English Studio
          </Link>
        </div>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Rewards is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Reward footprint" eyebrow="Live system pulse">
          <MetricList
            items={[
              { label: 'Leaderboard learners', value: String(leaderboard.length) },
              { label: 'Total XP tracked', value: String(totalXp) },
              { label: 'Badges unlocked', value: String(totalBadges) },
              { label: 'Highest level reached', value: String(highestLevel) },
            ]}
          />
        </Card>

        <Card title="Progression posture" eyebrow="Promotion reality">
          <MetricList
            items={[
              { label: 'Ready learners', value: String(readyLearners) },
              { label: 'Watchlist learners', value: String(workboard.filter((item) => item.progressionStatus === 'watch').length) },
              { label: 'On-track learners', value: String(workboard.filter((item) => item.progressionStatus === 'on-track').length) },
              { label: 'Configured badges', value: String(catalog.badges.length) },
            ]}
          />
        </Card>

        <Card title="XP policy" eyebrow="Current earning rules">
          <MetricList
            items={Object.entries(catalog.xpRules).length
              ? Object.entries(catalog.xpRules).map(([label, value]) => ({
                  label: label.replace(/([A-Z])/g, ' $1').trim(),
                  value: `${value} XP`,
                }))
              : [{ label: 'Status', value: 'Reward policy unavailable' }]}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '0.88fr 1.12fr', gap: 16, marginBottom: 20 }}>
        <Card title="Level ladder" eyebrow="How progression pacing works">
          <div style={{ display: 'grid', gap: 12 }}>
            {catalog.levels.length ? catalog.levels.map((level, index) => (
              <div key={level.level} style={{ padding: 16, borderRadius: 18, background: index === catalog.levels.length - 1 ? '#faf5ff' : '#f8fafc', border: `1px solid ${index === catalog.levels.length - 1 ? '#e9d5ff' : '#eef2f7'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <strong>Level {level.level} · {level.label}</strong>
                  <Pill label={`${level.minXp}+ XP`} tone={index === catalog.levels.length - 1 ? '#F3E8FF' : '#EEF2FF'} text={index === catalog.levels.length - 1 ? '#7E22CE' : '#3730A3'} />
                </div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>
                  {index === catalog.levels.length - 1
                    ? 'Top rung in the current ladder. If too many learners pile up here, add the next tier instead of pretending progression magically solved itself.'
                    : `Unlocks the ${catalog.levels[index + 1].label} tier at ${catalog.levels[index + 1].minXp} XP.`}
                </div>
              </div>
            )) : (
              <div style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7', color: '#64748b' }}>
                Level rules are unavailable right now.
              </div>
            )}
          </div>
        </Card>

        <Card title="Badge catalogue" eyebrow="What learners can earn">
          <SimpleTable
            columns={['Badge', 'Category', 'Unlock rule', 'Live signal']}
            rows={catalog.badges.length ? catalog.badges.map((badge) => {
              const unlocked = leaderboard.filter((item) => item.badges.some((entry) => entry.id === badge.id && entry.earned)).length;
              const nearestLearner = leaderboard[0] ? badgeProgressLabel(leaderboard[0], badge.id) : 'No learner progress yet';

              return [
                <div key={`${badge.id}-title`}>
                  <div style={{ fontWeight: 800 }}>{badge.title}</div>
                  <div style={{ color: '#64748b', marginTop: 4 }}>{badge.description}</div>
                </div>,
                badge.category,
                `${badge.target} ${badge.target === 1 ? 'milestone' : 'milestones'} needed`,
                `${unlocked} unlocked · lead learner: ${nearestLearner}`,
              ];
            }) : [[<span key="empty" style={{ color: '#64748b' }}>Badge catalog unavailable.</span>, '', '', '']]}
          />
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 16, marginBottom: 20 }}>
        <Card title="Leaderboard" eyebrow="Who is actually moving">
          <SimpleTable
            columns={['Learner', 'Level', 'XP status', 'Badges', 'Next move', 'Progression']}
            rows={leaderboard.length ? leaderboard.map((item) => {
              const workboardEntry = workboard.find((entry) => entry.studentName === item.learnerName);
              const tone = statusTone(workboardEntry?.progressionStatus ?? 'on-track');

              return [
                item.learnerName ?? item.learnerId,
                `${item.level} · ${item.levelLabel}`,
                `${item.totalXp} total · ${item.xpForNextLevel} to next`,
                `${item.badgesUnlocked} unlocked`,
                workboardEntry?.recommendedNextModuleTitle ?? item.nextLevelLabel ?? 'Keep building',
                <Pill key={item.learnerId} label={workboardEntry?.progressionStatus ?? 'on-track'} tone={tone.tone} text={tone.text} />,
              ];
            }) : [[<span key="empty" style={{ color: '#64748b' }}>Reward leaderboard unavailable.</span>, '', '', '', '', '']]}
          />
        </Card>

        <Card title="Operator guidance" eyebrow="Use the system like an adult">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['XP should follow mastery', 'Keep XP linked to lesson completion, evidence, and review quality. If points outrun real learning, the whole ladder becomes theatre.'],
              ['Badges need narrative weight', 'A badge should mark a behavior worth celebrating: first completion, streak, reading confidence, numeracy momentum. Not random clicking.'],
              ['Levels are pacing tools', 'Levels can motivate, but progression still belongs to readiness plus assessment gates. Reward hype should never override the curriculum spine.'],
              ['Mallams need visible reasons', 'When a learner levels up or stalls, the workboard should make the reason obvious so the teaching team is not stuck guessing.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
