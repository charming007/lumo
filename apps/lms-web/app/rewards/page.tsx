import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function RewardsPage() {
  return (
    <PilotScopeBlocker
      title="Rewards"
      rationale="Rewards adds manual admin power and incentive-policy noise that the pilot does not need to prove the core learner loop. It is too much write power for a deployment target that still needs boring operational discipline."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
