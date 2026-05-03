import { navigationItems, type NavigationItem } from './navigation.ts';

export type PilotBlockedRoute = {
  id: string;
  label: string;
  href: string;
  rationale: string;
  keepUsing: string[];
};

const FULL_ADMIN_SHELL_ENABLED =
  process.env.NEXT_PUBLIC_LUMO_FULL_ADMIN_SHELL === 'true'
  || process.env.LUMO_FULL_ADMIN_SHELL === 'true';

export const pilotNavMode = FULL_ADMIN_SHELL_ENABLED ? 'full-admin' : 'pilot-trimmed';

const BLOCKED_ROUTE_MAP: Record<string, Omit<PilotBlockedRoute, 'href'>> = {
  '/canvas': {
    id: 'canvas',
    label: 'Curriculum Studio',
    rationale: 'Pilot operators need one curriculum control plane. Keep creation, blocker cleanup, and release decisions inside Content Library instead of splitting truth across a second curriculum surface.',
    keepUsing: ['Dashboard', 'Content Library', 'Assignments', 'Settings'],
  },
  '/english': {
    id: 'english',
    label: 'English Studio',
    rationale: 'A separate English authoring cockpit is extra surface area for pilot. Use Content Library so release readiness, lesson fixes, and curriculum scope stay in one place.',
    keepUsing: ['Dashboard', 'Content Library', 'Assignments'],
  },
  '/rewards': {
    id: 'rewards',
    label: 'Rewards',
    rationale: 'Rewards admin adds manual power and extra trust-sensitive reporting without helping the pilot prove the core delivery loop. Keep operators focused on delivery, progress, and system trust first.',
    keepUsing: ['Dashboard', 'Progress', 'Assignments', 'Settings'],
  },
  '/reports': {
    id: 'reports',
    label: 'Reports',
    rationale: 'Broad stakeholder reporting is the wrong thing to trust before the pilot operating loop is nailed down. Use Dashboard, Progress, and Settings for live operational truth instead of a giant narrative export suite.',
    keepUsing: ['Dashboard', 'Progress', 'Settings'],
  },
  '/guide': {
    id: 'guide',
    label: 'Guide',
    rationale: 'The pilot shell should stay lean. Keep the handbook in docs and use the live product only for operational work that needs to happen during deployment and field delivery.',
    keepUsing: ['Dashboard', 'Content Library', 'Settings'],
  },
};

const BLOCKED_ROUTE_IDS = new Set(Object.values(BLOCKED_ROUTE_MAP).map((route) => route.id));

export const visibleNavigationItems: readonly NavigationItem[] = FULL_ADMIN_SHELL_ENABLED
  ? navigationItems
  : navigationItems.filter((item) => !BLOCKED_ROUTE_IDS.has(item.id));

export function getPilotBlockedRoute(pathname: string): PilotBlockedRoute | null {
  if (FULL_ADMIN_SHELL_ENABLED) return null;

  const matched = Object.entries(BLOCKED_ROUTE_MAP).find(([href]) => pathname === href || pathname.startsWith(`${href}/`));
  if (!matched) return null;

  const [href, route] = matched;
  return { ...route, href };
}

export function redirectIfPilotHiddenRoute(pathname: string) {
  return getPilotBlockedRoute(pathname) ?? {};
}
