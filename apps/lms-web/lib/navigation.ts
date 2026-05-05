export type NavigationItem = {
  id: string;
  label: string;
  href: string;
};

export const navigationItems: readonly NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'content', label: 'Content Library', href: '/content' },
  { id: 'assignments', label: 'Assignments', href: '/assignments' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'settings', label: 'Settings', href: '/settings' },
] as const;
