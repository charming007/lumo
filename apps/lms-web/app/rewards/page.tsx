import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function RewardsPage() {
  return (
    <PilotScopeBlocker
      title="Rewards"
      rationale="Rewards adds operational noise before the core curriculum, assignment, and learner-progress loop is fully trusted. For pilot, that is garnish, not a control plane."
      keepUsing={['Dashboard', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
