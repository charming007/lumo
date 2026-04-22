import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export const dynamic = 'force-dynamic';

export default function GuidePage() {
  return (
    <PilotScopeBlocker
      title="Guide"
      rationale="The pilot deployment target should stay focused on live operations. Training materials and walkthroughs belong in docs, not in the launch-critical navigation shell that reviewers use to judge deployment readiness."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
