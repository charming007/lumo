import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function RewardsPage() {
  return (
    <PilotScopeBlocker
      title="Rewards"
      rationale="Rewards is useful, but it is not part of the pilot-safe control plane. Leaving XP corrections, fulfillment queues, and leaderboard ops live during deployment review adds operator debt and another place for the LMS to look healthy before the core learning workflow is actually proven."
      keepUsing={['Dashboard blocker stack', 'Content library', 'Assignments board', 'Progress board', 'Settings trust center']}
    />
  );
}
