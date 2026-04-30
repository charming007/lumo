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
  { id: 'canvas', label: 'Curriculum Studio', href: '/canvas' },
  { id: 'english', label: 'English Studio', href: '/english' },
  { id: 'students', label: 'Students', href: '/students' },
  { id: 'mallams', label: 'Mallams', href: '/mallams' },
  { id: 'pods', label: 'Pods', href: '/pods' },
  { id: 'devices', label: 'Devices', href: '/devices' },
  { id: 'attendance', label: 'Attendance', href: '/attendance' },
  { id: 'assignments', label: 'Assignments', href: '/assignments' },
  { id: 'assessments', label: 'Assessments', href: '/assessments' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'rewards', label: 'Rewards', href: '/rewards' },
  { id: 'reports', label: 'Reports', href: '/reports' },
  { id: 'guide', label: 'Guide', href: '/guide' },
  { id: 'settings', label: 'Settings', href: '/settings' },
] as const;
