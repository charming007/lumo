import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export const dynamic = 'force-dynamic';

export default function CanvasPage() {
  return (
    <PilotScopeBlocker
      title="Curriculum Canvas"
      rationale="Pilot launch depends on one honest curriculum surface, not multiple structural views fighting over what looks ready. Content Library owns release cleanup and publish readiness for this deployment target."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
