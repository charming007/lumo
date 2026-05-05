import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export default function EnglishStudioPage() {
  return (
    <PilotScopeBlocker
      title="English Studio"
      rationale="Pilot delivery already has a real authoring lane in Content Library and Lesson Studio. Leaving a parallel studio live in navigation invites conflicting release decisions and operator confusion."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Settings']}
    />
  );
}
