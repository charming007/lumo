import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function ReportsPage() {
  return (
    <PilotScopeBlocker
      title="Reports"
      rationale="Reports is a broad stakeholder and export surface, not a launch-critical operator workflow. For pilot, this route creates reporting theatre before the operational loop is fully trustworthy."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
