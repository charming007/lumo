import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function CanvasPage() {
  return (
    <PilotScopeBlocker
      title="Curriculum Canvas"
      rationale="Canvas is useful for internal curriculum design, but it is a second structural truth surface beside Content Library. For pilot deployment, that is needless complexity and a great way to let two different screens disagree about readiness."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
