import Link from 'next/link';
import { fetchMeta, fetchRewardsLeaderboard, fetchWorkboard } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import type { MetaResponse, RewardSnapshot, WorkboardItem } from '../../lib/types';

const EMPTY_META: MetaResponse = {
  actor: {
    role: 'admin',
    name: 'Pilot Admin',
  },
  mode: 'offline',
  seedSummary: {},
};

function emptyLeaderboardRow(message: string) {
  return [[<span key={message} style={{ color: '#64748b' }}>{message}</span>, '', '', '', '', '']];
}

function toneForStatus(status: string) {
  if (status === 'ready') return ['#DCFCE7', '#166534'] as const;
  if (status === 'watch') return ['#FEF3C7', '#92400E'] as const;
  return ['#E0E7FF', '#3730A3'] as const;
}

export default async function SettingsPage() {
  const [metaResult, leaderboardResult, workboardResult] = await Promise.allSettled([
    fetchMeta(),
    fetchRewardsLeaderboard(8),
    fetchWorkboard(),
  ]);

  const meta = metaResult.status === 'fulfilled' ? metaResult.value : EMPTY_META;
  const leaderboard: RewardSnapshot[] = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
  const workboard: WorkboardItem[] = workboardResult.status === 'fulfilled' ? workboardResult.value : [];

  const failedSources = [
    metaResult.status === 'rejected' ? 'platform metadata' : null,
    leaderboardResult.status === 'rejected' ? 'XP leaderboard' : null,
    workboardResult.status === 'rejected' ? 'progression workboard' : null,
  ].filter(Boolean);

  const ready = workboard.filter((item) => item.progressionStatus === 'ready').length;
  const watch = workboard.filter((item) => item.progressionStatus === 'watch').length;
  const averageXp = leaderboard.length ? Math.round(leaderboard.reduce((sum, item) => sum + item.totalXp, 0) / leaderboard.length) : 0;
  const totalBadgesUnlocked = leaderboard.reduce((sum, item) => sum + item.badgesUnlocked, 0);
  const seedEntries = Object.entries(meta.seedSummary ?? {});

  return (
    <PageShell
      title="Settings"
      subtitle="Operational controls for reward logic, progression policy, voice defaults, and the visual rules that keep the LMS from drifting back into placeholder-land."
      aside={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/rewards" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open rewards board
          </Link>
          <Link href="/guide" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#0f172a', color: 'white', textDecoration: 'none' }}>
            Open LMS guide
          </Link>
        </div>
      }
    >
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Settings is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Runtime" eyebrow="Environment">
          <MetricList
            items={[
              { label: 'Actor', value: meta.actor.name },
              { label: 'Role', value: meta.actor.role },
              { label: 'Mode', value: meta.mode },
              { label: 'Seed packs', value: String(seedEntries.reduce((sum, [, count]) => sum + count, 0)) },
            ]}
          />
        </Card>

        <Card title="Reward system" eyebrow="XP + badges groundwork">
          <MetricList
            items={[
              { label: 'Learners on leaderboard', value: String(leaderboard.length) },
              { label: 'Average XP', value: String(averageXp) },
              { label: 'Badges unlocked', value: String(totalBadgesUnlocked) },
              { label: 'Highest level seen', value: String(Math.max(0, ...leaderboard.map((item) => item.level))) },
            ]}
          />
        </Card>

        <Card title="Progression policy" eyebrow="Promotion gates">
          <MetricList
            items={[
              { label: 'Ready right now', value: String(ready) },
              { label: 'Watchlist learners', value: String(watch) },
              { label: 'Assessment-gated movement', value: 'Enabled' },
              { label: 'Manual mallam review', value: 'Required on edge cases' },
            ]}
          />
        </Card>
      </section>

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="Reward configuration playbook" eyebrow="Admin guidance">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['XP earns trust, not chaos', 'Keep XP tied to lesson completion, attendance consistency, and verified mastery moments. Do not spray points for random taps.'],
              ['Badges should mean something', 'Use badges for durable behaviors like streaks, oral confidence, reading milestones, and collaboration — not busywork.'],
              ['Levels must pace the content', 'Learner levels should support module pacing and celebration, but the real promotion gate still comes from mastery + assessment readiness.'],
              ['Mallams need visibility', 'If a reward rule changes, expose the effect in workboards and learner views so facilitators are not guessing why a child jumped levels.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="LMS visual documentation" eyebrow="UI guardrails">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Navigation must stay explicit', 'Every admin surface should show where the operator is, what changed, and what action is next. Hidden state is where demos go to die.'],
              ['Real empty states only', 'When data is missing, say what feed failed and keep the page usable. No fake charts, no lorem ipsum, no “coming soon” wallpaper.'],
              ['Authoring first, toy flows last', 'Compact quick-edit forms are fine for metadata, but lesson creation and English studio work belong in full authoring surfaces.'],
              ['Destructive actions need friction', 'Delete flows should keep typed confirmation and impact notes. If a cascade can wreck a content lane, the UI should say so plainly.'],
            ].map(([title, detail]) => (
              <div key={title} style={{ padding: 16, borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16, marginBottom: 20 }}>
        <Card title="XP and badge leaderboard" eyebrow="Live reward surface">
          <SimpleTable
            columns={['Learner', 'Level', 'XP', 'Next level', 'Badges', 'Recent status']}
            rows={leaderboard.length ? leaderboard.map((item) => {
              const matchingWorkboard = workboard.find((entry) => entry.studentName === item.learnerName);
              const [pillTone, pillText] = toneForStatus(matchingWorkboard?.progressionStatus ?? 'on-track');

              return [
                item.learnerName ?? item.learnerId,
                `${item.level} · ${item.levelLabel}`,
                `${item.totalXp} total (${item.xpIntoLevel}/${item.xpForNextLevel})`,
                item.nextLevelLabel ? `${item.nextLevelLabel} @ ${item.nextLevelXp ?? '—'} XP` : 'Maxed current ladder',
                `${item.badgesUnlocked} unlocked`,
                <Pill key={item.learnerId} label={matchingWorkboard?.progressionStatus ?? 'on-track'} tone={pillTone} text={pillText} />,
              ];
            }) : emptyLeaderboardRow('Reward data is unavailable right now.')}
          />
        </Card>

        <Card title="Seed summary" eyebrow="What the environment loaded">
          <div style={{ display: 'grid', gap: 10 }}>
            {seedEntries.length ? seedEntries.map(([label, count]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                <span style={{ color: '#475569', textTransform: 'capitalize' }}>{label.replace(/([A-Z])/g, ' $1').trim()}</span>
                <strong>{count}</strong>
              </div>
            )) : (
              <div style={{ padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #eef2f7', color: '#64748b' }}>
                Seed summary is unavailable right now.
              </div>
            )}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
