import Link from 'next/link';
import { FeedbackBanner } from '../../components/feedback-banner';
import { RewardsAdminForm } from '../../components/rewards-admin-form';
import { fetchCohorts, fetchMallams, fetchPods, fetchRewardsCatalog, fetchRewardsLeaderboard, fetchStudents, fetchWorkboard } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';
import type { RewardCatalog } from '../../lib/rewards';
import type { RewardSnapshot, Student, WorkboardItem } from '../../lib/types';

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

function normalizeFilterValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const haystack = values.filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

export default async function RewardsPage({ searchParams }: { searchParams?: Promise<{ message?: string; q?: string | string[]; cohort?: string | string[]; pod?: string | string[]; mallam?: string | string[]; status?: string | string[] }> }) {
  const query = await searchParams;
  const [catalogResult, leaderboardResult, workboardResult, studentsResult, cohortsResult, podsResult, mallamsResult] = await Promise.allSettled([
    fetchRewardsCatalog(),
    fetchRewardsLeaderboard(50),
    fetchWorkboard(),
    fetchStudents(),
    fetchCohorts(),
    fetchPods(),
    fetchMallams(),
  ]);

  const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : EMPTY_CATALOG;
  const leaderboard: RewardSnapshot[] = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
  const workboard: WorkboardItem[] = workboardResult.status === 'fulfilled' ? workboardResult.value : [];
  const students: Student[] = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const cohorts = cohortsResult.status === 'fulfilled' ? cohortsResult.value : [];
  const pods = podsResult.status === 'fulfilled' ? podsResult.value : [];
  const mallams = mallamsResult.status === 'fulfilled' ? mallamsResult.value : [];

  const failedSources = [
    catalogResult.status === 'rejected' ? 'reward catalog' : null,
    leaderboardResult.status === 'rejected' ? 'leaderboard' : null,
    workboardResult.status === 'rejected' ? 'progression workboard' : null,
    studentsResult.status === 'rejected' ? 'learner roster' : null,
    cohortsResult.status === 'rejected' ? 'cohorts' : null,
    podsResult.status === 'rejected' ? 'pods' : null,
    mallamsResult.status === 'rejected' ? 'mallams' : null,
  ].filter(Boolean);

  const searchText = normalizeFilterValue(query?.q).trim().toLowerCase();
  const cohortFilter = normalizeFilterValue(query?.cohort).trim();
  const podFilter = normalizeFilterValue(query?.pod).trim();
  const mallamFilter = normalizeFilterValue(query?.mallam).trim();
  const statusFilter = normalizeFilterValue(query?.status).trim();

  const filteredStudents = students.filter((student) => {
    const cohortMatches = !cohortFilter || student.cohortId === cohortFilter;
    const podMatches = !podFilter || student.podId === podFilter;
    const mallamMatches = !mallamFilter || student.mallamId === mallamFilter;
    const queryMatches = matchesQuery([student.name, student.cohortName, student.podLabel, student.mallamName], searchText);
    return cohortMatches && podMatches && mallamMatches && queryMatches;
  });
  const filteredStudentIds = new Set(filteredStudents.map((student) => student.id));
  const filteredWorkboard = workboard.filter((item) => {
    const student = students.find((entry) => entry.name === item.studentName);
    const cohortMatches = !cohortFilter || student?.cohortId === cohortFilter;
    const podMatches = !podFilter || student?.podId === podFilter;
    const mallamMatches = !mallamFilter || student?.mallamId === mallamFilter;
    const statusMatches = !statusFilter || item.progressionStatus === statusFilter;
    const queryMatches = matchesQuery([item.studentName, item.cohortName, item.podLabel, item.mallamName, item.focus, item.recommendedNextModuleTitle], searchText);
    return cohortMatches && podMatches && mallamMatches && statusMatches && queryMatches;
  });
  const filteredLeaderboard = leaderboard.filter((item) => {
    const student = students.find((entry) => entry.id === item.learnerId || entry.name === item.learnerName);
    const workboardEntry = filteredWorkboard.find((entry) => entry.studentName === (item.learnerName ?? student?.name));
    const cohortMatches = !cohortFilter || student?.cohortId === cohortFilter || item.cohortId === cohortFilter;
    const podMatches = !podFilter || student?.podId === podFilter;
    const mallamMatches = !mallamFilter || student?.mallamId === mallamFilter;
    const statusMatches = !statusFilter || workboardEntry?.progressionStatus === statusFilter;
    const queryMatches = matchesQuery([item.learnerName, student?.cohortName, student?.podLabel, student?.mallamName, workboardEntry?.recommendedNextModuleTitle, item.levelLabel], searchText);
    return cohortMatches && podMatches && mallamMatches && statusMatches && queryMatches;
  });
  const filtersActive = Boolean(searchText || cohortFilter || podFilter || mallamFilter || statusFilter);

  const highestLevel = filteredLeaderboard.length ? Math.max(...filteredLeaderboard.map((item) => item.level)) : 0;
  const totalXp = filteredLeaderboard.reduce((sum, item) => sum + item.totalXp, 0);
  const totalBadges = filteredLeaderboard.reduce((sum, item) => sum + item.badgesUnlocked, 0);
  const readyLearners = filteredWorkboard.filter((item) => item.progressionStatus === 'ready').length;

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
      <FeedbackBanner message={query?.message} />
      {failedSources.length ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontWeight: 700 }}>
          Rewards is running in degraded mode: {failedSources.join(', ')} {failedSources.length === 1 ? 'feed is' : 'feeds are'} unavailable.
        </div>
      ) : null}

      <section style={{ marginBottom: 20 }}>
        <Card title="Rewards filters" eyebrow="Same scoping discipline as the other admin boards">
          <form style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...responsiveGrid(220), gap: 12 }}>
              <input name="q" defaultValue={searchText} placeholder="Search learner, pod, mallam, or next move" style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }} />
              <select name="cohort" defaultValue={cohortFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All cohorts</option>
                {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
              </select>
              <select name="pod" defaultValue={podFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All pods</option>
                {pods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label}</option>)}
              </select>
              <select name="mallam" defaultValue={mallamFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All mallams</option>
                {mallams.map((mallam) => <option key={mallam.id} value={mallam.id}>{mallam.displayName}</option>)}
              </select>
              <select name="status" defaultValue={statusFilter} style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' }}>
                <option value="">All progression states</option>
                <option value="on-track">On track</option>
                <option value="watch">Watch</option>
                <option value="ready">Ready</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" style={{ background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 }}>Apply filters</button>
              <a href="/rewards" style={{ borderRadius: 12, padding: '12px 16px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>Clear filters</a>
            </div>
          </form>
        </Card>
      </section>

      {filtersActive ? (
        <div style={{ marginBottom: 16, color: '#475569', fontWeight: 700 }}>
          Showing {filteredLeaderboard.length} leaderboard learner{filteredLeaderboard.length === 1 ? '' : 's'} in the current scope.
        </div>
      ) : null}

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        <Card title="Reward footprint" eyebrow="Live system pulse">
          <MetricList
            items={[
              { label: 'Leaderboard learners', value: String(filteredLeaderboard.length) },
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
              { label: 'Watchlist learners', value: String(filteredWorkboard.filter((item) => item.progressionStatus === 'watch').length) },
              { label: 'On-track learners', value: String(filteredWorkboard.filter((item) => item.progressionStatus === 'on-track').length) },
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

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        {filteredStudents.length ? (
          <RewardsAdminForm students={filteredStudents} catalog={catalog} />
        ) : (
          <Card title="Reward adjustments" eyebrow="Unavailable right now">
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>
              {filtersActive
                ? 'No learners match the current scope, so manual reward writes stay disabled instead of guessing.'
                : 'Reward write controls are paused until the learner roster loads again. No roster, no safe manual award.'}
            </div>
          </Card>
        )}

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

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
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
              const unlocked = filteredLeaderboard.filter((item) => item.badges.some((entry) => entry.id === badge.id && entry.earned)).length;
              const nearestLearner = filteredLeaderboard[0] ? badgeProgressLabel(filteredLeaderboard[0], badge.id) : 'No learner progress yet';

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
            rows={filteredLeaderboard.length ? filteredLeaderboard.map((item) => {
              const workboardEntry = filteredWorkboard.find((entry) => entry.studentName === item.learnerName);
              const tone = statusTone(workboardEntry?.progressionStatus ?? 'on-track');

              return [
                item.learnerName ?? item.learnerId,
                `${item.level} · ${item.levelLabel}`,
                `${item.totalXp} total · ${item.xpForNextLevel} to next`,
                `${item.badgesUnlocked} unlocked`,
                workboardEntry?.recommendedNextModuleTitle ?? item.nextLevelLabel ?? 'Keep building',
                <Pill key={item.learnerId} label={workboardEntry?.progressionStatus ?? 'on-track'} tone={tone.tone} text={tone.text} />,
              ];
            }) : [[<span key="empty" style={{ color: '#64748b' }}>{filtersActive ? 'No leaderboard records match the current filters.' : 'Reward leaderboard unavailable.'}</span>, '', '', '', '', '']]}
          />
        </Card>

        <Card title="Manual award guardrails" eyebrow="Because admin writes need taste">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Use small corrections', 'This control is for recovery XP, verified badge fixes, and intentional recognitions. It is not a slot machine.'],
              ['Write the reason', 'Every manual award should carry a plain-English label so the next admin knows why the number moved.'],
              ['Don’t bypass progression logic', 'If the real issue is readiness, use the progression override board. XP is not a substitute for curriculum decisions.'],
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
