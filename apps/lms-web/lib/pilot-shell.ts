import { navigationItems } from './navigation.ts';
import { PILOT_BLOCKED_ROUTES, PILOT_OFF_SHELL_ROUTE_IDS, PILOT_OFF_SHELL_ROUTE_LABELS } from './pilot-nav.ts';

function normalizePathname(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed) return '/';
  if (trimmed === '/') return '/';
  return trimmed.replace(/\/+$/, '') || '/';
}

function routeIdFromPathname(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (normalized === '/') return 'dashboard';
  return normalized.slice(1).split('/')[0] ?? '';
}

export function describePilotShellRoute(pathname: string) {
  const routeId = routeIdFromPathname(pathname);
  const visibleItem = navigationItems.find((item) => item.id === routeId) ?? null;
  if (visibleItem) {
    return {
      routeId,
      routeLabel: visibleItem.label,
      status: 'visible' as const,
      eyebrow: 'Pilot route',
      title: `${visibleItem.label} is inside the visible pilot shell.`,
      detail: 'This route is one of the operator surfaces the sidebar intentionally exposes for pilot go-live.',
    };
  }

  const blockedRoute = PILOT_BLOCKED_ROUTES.find((route) => route.id === routeId) ?? null;
  if (blockedRoute) {
    return {
      routeId,
      routeLabel: blockedRoute.label,
      status: 'blocked' as const,
      eyebrow: 'Blocked surface',
      title: `${blockedRoute.label} is explicitly blocked for pilot use.`,
      detail: 'If this route is open at all, treat it as a blocker surface rather than a deployment-ready operator workflow.',
    };
  }

  const offShellIndex = PILOT_OFF_SHELL_ROUTE_IDS.indexOf(routeId);
  if (offShellIndex >= 0) {
    const routeLabel = PILOT_OFF_SHELL_ROUTE_LABELS[offShellIndex] ?? routeId;
    return {
      routeId,
      routeLabel,
      status: 'off-shell' as const,
      eyebrow: 'Specialist route',
      title: `${routeLabel} is live but outside the pilot shell.`,
      detail: 'Do not treat this page as proof that the wider LMS surface is pilot-approved just because it renders behind the same chrome.',
    };
  }

  return {
    routeId,
    routeLabel: routeId || 'Unknown route',
    status: 'unknown' as const,
    eyebrow: 'Unclassified route',
    title: 'This route is not part of the named pilot shell.',
    detail: 'If someone is using it during deployment review, they should verify scope first instead of assuming the shell makes it pilot-safe.',
  };
}
