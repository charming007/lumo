import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function GuidePage() {
  return (
    <PilotScopeBlocker
      title="Guide"
      rationale="Bundled docs are useful, but this route broadens pilot scope and nudges operators away from the actual live control surfaces. During deployment review, keep people inside the dashboard workflow and the curated docs already linked from the repo and verification pack."
      keepUsing={['Dashboard blocker stack', 'Content library', 'Assignments board', 'Progress board', 'Settings trust center']}
    />
  );
}
