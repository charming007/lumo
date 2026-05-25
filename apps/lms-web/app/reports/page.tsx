import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function ReportsPage() {
  return (
    <PilotScopeBlocker
      title="Reports"
      rationale="Reports can look polished long before the underlying progress semantics deserve that trust. For pilot go-live, this surface stays blocked so operators work from the narrower dashboard, assignments, progress, and settings loop instead of treating broad reporting as already sign-off safe."
      keepUsing={['Dashboard blocker stack', 'Assignments board', 'Progress board', 'Settings trust center']}
    />
  );
}
