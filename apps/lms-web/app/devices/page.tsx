import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function DevicesPage() {
  return (
    <PilotScopeBlocker
      title="Devices"
      rationale="Tablet registration, reassignment, and deletion still carry real write power. Leaving this route live outside the pilot shell turns a hidden deep link into production scope drift with hardware ownership consequences."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
