import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function ReportsPage() {
  return (
    <PilotScopeBlocker
      title="Reports"
      rationale="The pilot should not pretend donor-ready reporting is part of the trusted daily control plane yet. Use Dashboard, Progress, and Settings until the evidence model is strong enough to earn this route back."
      keepUsing={['Dashboard', 'Progress', 'Settings']}
    />
  );
}
