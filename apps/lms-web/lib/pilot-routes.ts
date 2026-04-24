export const pilotNavigationItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'content', label: 'Content Library', href: '/content' },
  { id: 'assignments', label: 'Assignments', href: '/assignments' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'settings', label: 'Settings', href: '/settings' },
] as const;

export const pilotTopLevelRoutes = pilotNavigationItems
  .map((item) => item.href)
  .filter((href) => href !== '/');

export const pilotTopLevelRouteSet: ReadonlySet<string> = new Set(pilotTopLevelRoutes);

export function isPilotPath(pathname: string) {
  if (pathname === '/') return true;

  const [segment] = pathname.split('/').filter(Boolean);
  return segment ? pilotTopLevelRouteSet.has(`/${segment}`) : false;
}

export function formatBlockedPilotPath(pathname: string) {
  if (!pathname || pathname === '/') return '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}
