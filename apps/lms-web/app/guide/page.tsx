import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function GuidePage() {
  return (
    <PilotScopeBlocker
      title="Guide"
      rationale="Heavy in-product docs are not part of the pilot operating loop. Keep documentation in docs and training packs, not as a first-class route that bloats the live LMS shell."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
