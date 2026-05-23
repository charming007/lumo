import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function CanvasPage() {
  return (
    <PilotScopeBlocker
      title="Curriculum Canvas"
      rationale="Pilot scope already picked /content as the only curriculum control plane. Leaving Canvas live during deployment review invites parallel truth, side-door lesson edits, and exactly the sort of scope creep the pilot cut was meant to kill."
      keepUsing={['Dashboard blocker stack', 'Content library', 'Assignments board', 'Progress board', 'Settings trust center']}
    />
  );
}
