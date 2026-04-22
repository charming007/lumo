import { PilotScopeBlocker } from '../../components/pilot-scope-blocker';

export const dynamic = 'force-dynamic';

export default function EnglishPage() {
  return (
    <PilotScopeBlocker
      title="English Studio"
      rationale="Pilot operators already have Content Library as the single curriculum control plane. Keeping a second English-specific authoring surface live during deployment review invites conflicting release decisions and fake confidence."
      keepUsing={['Dashboard', 'Content Library', 'Assignments', 'Progress', 'Settings']}
    />
  );
}
