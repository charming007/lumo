import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export const dynamic = 'force-dynamic';

export default function RewardsPage() {
  return (
    <PilotScopeBlocker
      title="Rewards"
      rationale="Manual rewards operations are deliberately out of pilot scope. They add write-heavy admin power and trust-sensitive derived data without helping the core launch loop of content, assignment, progression, and deployment readiness."
      keepUsing={['Dashboard', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
