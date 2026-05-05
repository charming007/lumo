import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function GuidePage() {
  return (
    <PilotScopeBlocker
      title="Guide"
      rationale="Documentation is still available as shipped HTML, but it should not sit in the primary pilot navigation like a day-to-day operator lane. Keep the shell focused on live operations."
      keepUsing={['Dashboard', 'Content Library', 'Settings']}
    />
  );
}
