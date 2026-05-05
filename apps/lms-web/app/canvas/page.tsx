import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function CanvasPage() {
  return (
    <PilotScopeBlocker
      title="Curriculum Studio"
      rationale="Pilot operators should use Content Library as the single curriculum control plane. Leaving a second curriculum surface live in nav is how release decisions get inconsistent and dumb."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Settings']}
    />
  );
}
