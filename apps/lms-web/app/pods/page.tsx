import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function PodsPage() {
  return (
    <PilotScopeBlocker
      title="Pods"
      rationale="Pod CRUD changes geography, mallam ownership, and tablet routing for the whole rollout. That is not a pilot sign-off surface, and shipping it as a still-live deep link is unnecessary operational risk."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
