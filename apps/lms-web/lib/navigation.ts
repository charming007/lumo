export type NavigationItem = {
  id: string;
  label: string;
  href: string;
};

export const fullNavigationItems: readonly NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'students', label: 'Learners', href: '/students' },
  { id: 'mallams', label: 'Mallams', href: '/mallams' },
  { id: 'pods', label: 'Pods', href: '/pods' },
  { id: 'devices', label: 'Devices', href: '/devices' },
  { id: 'attendance', label: 'Attendance', href: '/attendance' },
  { id: 'content', label: 'Content Library', href: '/content' },
  { id: 'english', label: 'English Studio', href: '/english' },
  { id: 'canvas', label: 'Curriculum Canvas', href: '/canvas' },
  { id: 'assessments', label: 'Assessments', href: '/assessments' },
  { id: 'assignments', label: 'Assignments', href: '/assignments' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'rewards', label: 'Rewards', href: '/rewards' },
  { id: 'reports', label: 'Reports', href: '/reports' },
  { id: 'guide', label: 'Guide', href: '/guide' },
  { id: 'settings', label: 'Settings', href: '/settings' },
] as const;

export const pilotNavigationItems: readonly NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'content', label: 'Content Library', href: '/content' },
  { id: 'assignments', label: 'Assignments', href: '/assignments' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'settings', label: 'Settings', href: '/settings' },
] as const;

export function getNavigationItems(pilotControlPlaneEnabled: boolean) {
  return pilotControlPlaneEnabled ? pilotNavigationItems : fullNavigationItems;
}

export const navigationItems = fullNavigationItems;
