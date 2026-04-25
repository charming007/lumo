import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function EnglishStudioPage() {
  return (
    <PilotScopeBlocker
      title="English Studio"
      rationale="English Studio duplicates lesson authoring and release planning already covered by Content Library. For pilot, a second curriculum control room is exactly how bad content sneaks through while everyone thinks someone else checked it."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
