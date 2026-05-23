import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function EnglishStudioPage() {
  return (
    <PilotScopeBlocker
      title="English Studio"
      rationale="Pilot scope says lesson authoring lives in /content, full stop. Keeping a second specialist authoring lane live during go-live is how you get duplicate workflows, conflicting publish decisions, and operators making curriculum edits in the wrong place."
      keepUsing={['Dashboard blocker stack', 'Content library', 'Assignments board', 'Progress board', 'Settings trust center']}
    />
  );
}
