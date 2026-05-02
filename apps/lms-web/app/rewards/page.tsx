import { RewardRequestQueuePanel } from '../../components/reward-request-queue-panel';
import { RewardsAdminForm } from '../../components/rewards-admin-form';
import { fetchRewardRequests, fetchRewardsCatalog, fetchRewardsLeaderboard, fetchRewardsReport, fetchStudents } from '../../lib/api';
import type { RewardSnapshot, RewardTransaction, RewardRequestQueue, RewardsReport, Student } from '../../lib/types';
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

const emptyReport: RewardsReport = {
  scope: { learnerCount: 0 },
  summary: {
    learners: 0,
    transactionCount: 0,
    totalXpAwarded: 0,
    totalXpRedeemed: 0,
    requestCount: 0,
    correctionCount: 0,
    revocationCount: 0,
    fulfillmentRate: 0,
    requestStatusCounts: {},
  },
  dailyXpTrend: [],
  rewardDemand: [],
  recentTransactions: [],
  recentRequests: [],
  recentAdjustments: [],
  learnerBreakdown: [],
  leaderboard: [],
};

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en').format(Number(value ?? 0));
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatRewardKind(value: string | null | undefined) {
  if (!value) return 'Reward activity';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function rewardProgressPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized * 100)));
}

function toneForDelta(value: number) {
  return value >= 0 ? { tone: '#ECFDF5', text: '#166534' } : { tone: '#FEF2F2', text: '#B91C1C' };
}

function getLearnerHref(learnerId: string) {
  return `/rewards?learner=${encodeURIComponent(learnerId)}`;
}

function MiniTrendChart({ points }: { points: RewardsReport['dailyXpTrend'] }) {
  if (!points.length) {
    return <div style={{ color: '#64748b', lineHeight: 1.6 }}>No XP trend yet. As learners start earning and redeeming rewards, the weekly pulse will show up here.</div>;
  }

  const recent = points.slice(-7);
  const max = Math.max(...recent.map((point) => Math.max(point.xpAwarded, point.xpRedeemed, 1)), 1);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${recent.length}, minmax(0, 1fr))`, gap: 10, alignItems: 'end', minHeight: 180 }}>
        {recent.map((point) => {
          const awardedHeight = Math.max(12, Math.round((point.xpAwarded / max) * 120));
          const redeemedHeight = Math.max(point.xpRedeemed > 0 ? 12 : 4, Math.round((point.xpRedeemed / max) * 120));
          return (
            <div key={point.date} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'end', gap: 6, height: 132 }}>
                <div title={`${point.xpAwarded} XP awarded`} style={{ width: 18, height: awardedHeight, borderRadius: 999, background: 'linear-gradient(180deg, #6366F1 0%, #8B5CF6 100%)' }} />
                <div title={`${point.xpRedeemed} XP redeemed`} style={{ width: 18, height: redeemedHeight, borderRadius: 999, background: 'linear-gradient(180deg, #F59E0B 0%, #F97316 100%)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{new Date(point.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{point.transactions} txns</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#475569', fontSize: 13 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: '#7C3AED', display: 'inline-block' }} />Awarded XP</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: '#F59E0B', display: 'inline-block' }} />Redeemed XP</span>
      </div>
    </div>
  );
}

function LearnerXpComposition({ awarded, redeemed, total }: { awarded: number; redeemed: number; total: number }) {
  const safeAwarded = Math.max(awarded, 0);
  const safeRedeemed = Math.max(redeemed, 0);
  const pool = Math.max(safeAwarded + safeRedeemed, 1);
  const awardedWidth = Math.round((safeAwarded / pool) * 100);
  const redeemedWidth = Math.max(0, 100 - awardedWidth);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#475569', fontSize: 14 }}>
        <span>Lifetime XP composition</span>
        <strong style={{ color: '#0f172a' }}>{formatNumber(total)} net XP</strong>
      </div>
      <div style={{ height: 14, borderRadius: 999, overflow: 'hidden', background: '#E2E8F0', display: 'flex' }}>
        <div style={{ width: `${awardedWidth}%`, background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />
        <div style={{ width: `${redeemedWidth}%`, background: 'linear-gradient(90deg, #F59E0B, #F97316)' }} />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Pill label={`${formatNumber(awarded)} earned`} tone="#EEF2FF" text="#3730A3" />
        <Pill label={`${formatNumber(redeemed)} redeemed`} tone="#FFF7ED" text="#C2410C" />
      </div>
    </div>
  );
}

function LearnerActivityFeed({ transactions }: { transactions: RewardTransaction[] }) {
  if (!transactions.length) {
    return <div style={{ color: '#64748b', lineHeight: 1.6 }}>No reward activity yet for this learner. Once lesson wins, badge unlocks, or admin corrections land, they’ll show up here.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {transactions.slice(0, 6).map((transaction) => {
        const tone = toneForDelta(Number(transaction.xpDelta ?? 0));
        return (
          <div key={transaction.id} style={{ borderRadius: 16, border: '1px solid #E2E8F0', padding: '14px 16px', display: 'grid', gap: 6, background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ color: '#0f172a' }}>{transaction.label || formatRewardKind(transaction.kind)}</strong>
              <Pill label={`${Number(transaction.xpDelta) >= 0 ? '+' : ''}${transaction.xpDelta} XP`} tone={tone.tone} text={tone.text} />
            </div>
            <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
              {formatRewardKind(transaction.kind)} • {formatDate(transaction.createdAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function RewardsPage({ searchParams }: { searchParams?: Promise<{ learner?: string }> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [catalogResult, leaderboardResult, requestsResult, studentsResult, reportResult] = await Promise.allSettled([
    fetchRewardsCatalog(),
    fetchRewardsLeaderboard(12),
    fetchRewardRequests(12),
    fetchStudents(),
    fetchRewardsReport(20),
  ]);

  const catalog: RewardCatalog = catalogResult.status === 'fulfilled' ? catalogResult.value : emptyCatalog;
  const leaderboard: RewardSnapshot[] = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
  const requests: RewardRequestQueue = requestsResult.status === 'fulfilled' ? requestsResult.value : emptyRequestQueue;
  const students: Student[] = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
  const report: RewardsReport = reportResult.status === 'fulfilled' ? reportResult.value : emptyReport;
  const reportLeaderboard = report.leaderboard?.length ? report.leaderboard : [];
  const learners = leaderboard.length ? leaderboard : reportLeaderboard;
  const failedSources = [
    catalogResult.status === 'rejected' ? 'reward catalog' : null,
    leaderboardResult.status === 'rejected' ? 'leaderboard' : null,
    requestsResult.status === 'rejected' ? 'reward requests' : null,
    studentsResult.status === 'rejected' ? 'students' : null,
    reportResult.status === 'rejected' ? 'rewards analytics' : null,
  ].filter(Boolean) as string[];
  const hasCoreRewardsGap = catalogResult.status === 'rejected' || requestsResult.status === 'rejected';

  const selectedLearnerId = resolvedSearchParams?.learner && learners.some((learner) => learner.learnerId === resolvedSearchParams.learner)
    ? resolvedSearchParams.learner
    : learners[0]?.learnerId;
  const selectedLearner = learners.find((learner) => learner.learnerId === selectedLearnerId) || null;
  const selectedBreakdown = report.learnerBreakdown.find((learner) => learner.learnerId === selectedLearnerId) || null;
  const topDemand = report.rewardDemand.slice(0, 4);
  const cohortAverageXp = report.summary.learners ? Math.round(report.summary.totalXpAwarded / Math.max(report.summary.learners, 1)) : 0;
  const progressPercent = rewardProgressPercent(selectedLearner?.progressToNextLevel);

  return (
    <PageShell
      title="Rewards"
      subtitle="A proper learner rewards board: see momentum, badge progress, redemption pressure, and recent activity before dropping into the admin repair kit."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Rewards snapshot" eyebrow="Live API + analytics">
          <MetricList
            items={[
              { label: 'Learners tracked', value: formatNumber(report.summary.learners || learners.length) },
              { label: 'Pending requests', value: formatNumber(requests.summary?.pending || 0) },
              { label: 'Catalog badges', value: formatNumber(catalog.badges?.length || 0) },
              { label: 'Fulfillment rate', value: formatPercent(report.summary.fulfillmentRate || 0) },
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

      <section style={{ ...responsiveGrid(220), marginBottom: 20 }}>
        {[
          ['Learners earning XP', formatNumber(report.summary.learners || learners.length), 'Active reward footprint across the current scope.'],
          ['XP awarded', formatNumber(report.summary.totalXpAwarded), 'Total positive XP pushed through the rewards system.'],
          ['XP redeemed', formatNumber(report.summary.totalXpRedeemed), 'How much learner progress has already turned into rewards.'],
          ['Corrections + revokes', formatNumber((report.summary.correctionCount || 0) + (report.summary.revocationCount || 0)), 'Manual intervention volume — useful when trust is getting weird.'],
        ].map(([title, value, detail]) => (
          <Card key={title} title={String(value)} eyebrow={String(title)}>
            <div style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</div>
          </Card>
        ))}
      </section>

      <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
        <Card title="XP momentum" eyebrow="Last 7 reward days">
          <MiniTrendChart points={report.dailyXpTrend} />
        </Card>
        <Card title="Reward demand" eyebrow="What learners are trying to redeem">
          <div style={{ display: 'grid', gap: 12 }}>
            {topDemand.length ? topDemand.map((item) => {
              const demandTotal = Math.max(item.requests, 1);
              const fulfilledWidth = Math.round((item.fulfilled / demandTotal) * 100);
              return (
                <div key={item.rewardItemId} style={{ display: 'grid', gap: 8, padding: 14, borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#0f172a' }}>{item.rewardTitle}</strong>
                    <span style={{ color: '#475569', fontSize: 14 }}>{formatNumber(item.requests)} requests</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden' }}>
                    <div style={{ width: `${fulfilledWidth}%`, height: '100%', background: 'linear-gradient(90deg, #22C55E, #16A34A)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Pill label={`${formatNumber(item.fulfilled)} fulfilled`} tone="#ECFDF5" text="#166534" />
                    <Pill label={`${formatNumber(item.pending)} pending`} tone="#FFF7ED" text="#C2410C" />
                  </div>
                </div>
              );
            }) : <div style={{ color: '#64748b', lineHeight: 1.6 }}>No redemption demand yet. That probably means the learner app hasn’t produced reward-claim traffic, not that incentives are magically solved.</div>}
          </div>
        </Card>
      </section>

      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#8a94a6', marginBottom: 8, fontWeight: 800 }}>Learner rewards board</div>
            <h2 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Top learners, with actual detail</h2>
            <p style={{ margin: '8px 0 0', color: '#556070', lineHeight: 1.6 }}>Pick a learner to inspect XP, badge progress, transactions, and redemption behavior without spelunking through raw admin forms.</p>
          </div>
        </div>
        <div style={{ ...responsiveGrid(260) }}>
          {learners.length ? learners.map((learner) => {
            const isSelected = learner.learnerId === selectedLearnerId;
            return (
              <a
                key={learner.learnerId}
                href={getLearnerHref(learner.learnerId)}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ background: isSelected ? 'linear-gradient(180deg, #EEF2FF 0%, #FFFFFF 45%)' : 'white', borderRadius: 24, padding: 20, border: `1px solid ${isSelected ? '#C7D2FE' : '#E2E8F0'}`, boxShadow: isSelected ? '0 16px 36px rgba(99, 102, 241, 0.12)' : '0 10px 30px rgba(15, 23, 42, 0.05)', display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 18 }}>{learner.learnerName || learner.learnerId}</div>
                      <div style={{ color: '#64748b', marginTop: 4 }}>{learner.levelLabel || `Level ${learner.level}`}</div>
                    </div>
                    {isSelected ? <Pill label="Selected" tone="#E0E7FF" text="#4338CA" /> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Pill label={`${formatNumber(learner.totalXp)} XP`} tone="#EEF2FF" text="#3730A3" />
                    <Pill label={`${formatNumber(learner.badgesUnlocked)} badges`} tone="#FEF3C7" text="#92400E" />
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, color: '#475569' }}>
                      <span>Progress to next level</span>
                      <strong style={{ color: '#0f172a' }}>{rewardProgressPercent(learner.progressToNextLevel)}%</strong>
                    </div>
                    <div style={{ height: 10, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden' }}>
                      <div style={{ width: `${rewardProgressPercent(learner.progressToNextLevel)}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #F59E0B)' }} />
                    </div>
                  </div>
                </div>
              </a>
            );
          }) : (
            <Card title="No learner rewards yet" eyebrow="Waiting on live reward traffic">
              <div style={{ color: '#64748b', lineHeight: 1.6 }}>The page is ready, but there’s no leaderboard or analytics data in scope yet. Once the learner app starts emitting XP and reward events, this board will stop looking lonely.</div>
            </Card>
          )}
        </div>
      </section>

      {selectedLearner ? (
        <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
          <Card title={selectedLearner.learnerName || selectedLearner.learnerId} eyebrow="Learner rewards detail">
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Pill label={`Level ${selectedLearner.level}`} tone="#EEF2FF" text="#3730A3" />
                <Pill label={`${formatNumber(selectedLearner.totalXp)} net XP`} tone="#ECFDF5" text="#166534" />
                <Pill label={`${formatNumber(selectedLearner.badgesUnlocked)} badges`} tone="#FDF2F8" text="#9D174D" />
                <Pill label={`${formatNumber(selectedBreakdown?.pendingRequests || 0)} pending requests`} tone="#FFF7ED" text="#C2410C" />
              </div>
              <MetricList
                items={[
                  { label: 'Current level', value: selectedLearner.levelLabel || `Level ${selectedLearner.level}` },
                  { label: 'Next level target', value: selectedLearner.nextLevelLabel || `Need ${formatNumber(selectedLearner.xpForNextLevel)} XP` },
                  { label: 'Transactions', value: formatNumber(selectedBreakdown?.transactions || selectedLearner.recentTransactions.length) },
                  { label: 'Vs cohort average', value: `${selectedLearner.totalXp >= cohortAverageXp ? '+' : ''}${formatNumber(selectedLearner.totalXp - cohortAverageXp)} XP` },
                ]}
              />
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#475569', fontSize: 14 }}>
                  <span>Progress to next reward level</span>
                  <strong style={{ color: '#0f172a' }}>{progressPercent}%</strong>
                </div>
                <div style={{ height: 12, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #F59E0B)' }} />
                </div>
              </div>
              <LearnerXpComposition
                awarded={selectedBreakdown?.xpAwarded || Math.max(selectedLearner.totalXp, 0)}
                redeemed={selectedBreakdown?.xpRedeemed || 0}
                total={selectedLearner.totalXp}
              />
            </div>
          </Card>

          <Card title="Badges + recent wins" eyebrow="What this learner has actually unlocked">
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedLearner.badges?.length ? selectedLearner.badges.slice(0, 8).map((badge) => (
                  <Pill key={badge.id} label={`${badge.title} · ${badge.progress}/${badge.target || 0}`} tone={badge.earned ? '#FCE7F3' : '#F8FAFC'} text={badge.earned ? '#9D174D' : '#475569'} />
                )) : <span style={{ color: '#64748b', lineHeight: 1.6 }}>No badges yet. That’s either early learner progress or a feed that still needs more real activity.</span>}
              </div>
              <LearnerActivityFeed transactions={selectedLearner.recentTransactions || []} />
            </div>
          </Card>
        </section>
      ) : null}

      <details style={{ marginBottom: 20 }}>
        <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '18px 20px', borderRadius: 20, border: '1px solid #E2E8F0', background: '#F8FAFC', fontWeight: 800, color: '#0f172a' }}>
          <span>Admin reward correction tools</span>
          <span style={{ color: '#64748b', fontSize: 14, fontWeight: 700 }}>Secondary section — use when live rewards need manual repair</span>
        </summary>
        <div style={{ paddingTop: 16 }}>
          <section style={{ ...responsiveGrid(320), marginBottom: 20 }}>
            <RewardsAdminForm students={students} catalog={catalog} leaderboard={learners} />
          </section>
          <RewardRequestQueuePanel queue={requests} />
        </div>
      </details>
    </PageShell>
  );
}
