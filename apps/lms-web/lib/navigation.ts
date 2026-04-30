export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  availability?: 'deferred';
  availabilityLabel?: string;
};

export const navigationItems: readonly NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'content', label: 'Content Library', href: '/content' },
  { id: 'assignments', label: 'Assignments', href: '/assignments' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'devices', label: 'Devices', href: '/devices' },
  { id: 'settings', label: 'Settings', href: '/settings' },
  { id: 'canvas', label: 'Curriculum Studio', href: '/canvas', availability: 'deferred', availabilityLabel: 'Internal only' },
  { id: 'english', label: 'English Studio', href: '/english', availability: 'deferred', availabilityLabel: 'Internal only' },
  { id: 'students', label: 'Students', href: '/students', availability: 'deferred', availabilityLabel: 'Back office' },
  { id: 'mallams', label: 'Mallams', href: '/mallams', availability: 'deferred', availabilityLabel: 'Back office' },
  { id: 'pods', label: 'Pods', href: '/pods', availability: 'deferred', availabilityLabel: 'Back office' },
  { id: 'attendance', label: 'Attendance', href: '/attendance', availability: 'deferred', availabilityLabel: 'Back office' },
  { id: 'assessments', label: 'Assessments', href: '/assessments', availability: 'deferred', availabilityLabel: 'Back office' },
  { id: 'rewards', label: 'Rewards', href: '/rewards', availability: 'deferred', availabilityLabel: 'Post-pilot' },
  { id: 'reports', label: 'Reports', href: '/reports', availability: 'deferred', availabilityLabel: 'Post-pilot' },
  { id: 'guide', label: 'Guide', href: '/guide', availability: 'deferred', availabilityLabel: 'Docs only' },
] as const;
