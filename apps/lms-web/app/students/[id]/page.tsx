import { PilotScopeBlocker } from '../../../components/pilot-scope-blocker';

export default function StudentDetailPage() {
  return (
    <PilotScopeBlocker
      title="Learner detail"
      rationale="Direct learner profile URLs still expose edit, delete, and rerouting controls. If the pilot shell says roster admin is out of scope, the detail route cannot stay live as a back door."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
