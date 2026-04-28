import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function MallamsPage() {
  return (
    <PilotScopeBlocker
      title="Mallams"
      rationale="Facilitator CRUD and roster control sit outside the pilot operating loop. Leaving this route deployed with live write actions undermines the shell scoping work and exposes unnecessary admin power through deep links."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
