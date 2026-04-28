import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function StudentsPage() {
  return (
    <PilotScopeBlocker
      title="Students"
      rationale="Learner CRUD and routing workflows are heavy roster-admin surfaces with delete and reassignment power. The pilot dashboard intentionally stays lighter than that, so this route should block instead of remaining quietly reachable by URL."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
