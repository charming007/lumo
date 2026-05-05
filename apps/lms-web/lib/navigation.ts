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
  { id: 'devices', label: 'Devices', href: '/devices' },
  { id: 'settings', label: 'Settings', href: '/settings' },
  { id: 'canvas', label: 'Curriculum Studio', href: '/canvas' },
  { id: 'english', label: 'English Studio', href: '/english' },
  { id: 'students', label: 'Students', href: '/students' },
  { id: 'mallams', label: 'Mallams', href: '/mallams' },
  { id: 'pods', label: 'Pods', href: '/pods' },
  { id: 'attendance', label: 'Attendance', href: '/attendance' },
  { id: 'assessments', label: 'Assessments', href: '/assessments' },
  { id: 'rewards', label: 'Rewards', href: '/rewards' },
  { id: 'reports', label: 'Reports', href: '/reports' },
  { id: 'guide', label: 'Guide', href: '/guide' },
] as const;
