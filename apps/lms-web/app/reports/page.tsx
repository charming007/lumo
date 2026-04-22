import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  return (
    <PilotScopeBlocker
      title="Reports"
      rationale="Broad reporting and export surfaces are not part of the pilot deployment target. Operators need live intervention trust, not a giant reporting theater that can drift away from the launch-critical workflow."
      keepUsing={['Dashboard', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
