import { PilotScopeBlocker } from '../../../components/pilot-scope-blocker';

export default function MallamDetailPage() {
  return (
    <PilotScopeBlocker
      title="Mallam detail"
      rationale="Direct facilitator profile links still allow profile edits, deletion, and roster control. Shipping that outside the pilot route set is hidden scope expansion, not a harmless leftover page."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
