export const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'content', label: 'Content Library', href: '/content' },
  { id: 'canvas', label: 'Curriculum Canvas', href: '/canvas' },
  { id: 'students', label: 'Students', href: '/students' },
  { id: 'mallams', label: 'Mallams', href: '/mallams' },
  { id: 'pods', label: 'Pods', href: '/pods' },
  { id: 'devices', label: 'Devices', href: '/devices' },
  { id: 'attendance', label: 'Attendance', href: '/attendance' },
  { id: 'assignments', label: 'Assignments', href: '/assignments' },
  { id: 'assessments', label: 'Assessments', href: '/assessments' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'reports', label: 'Reports', href: '/reports' },
  { id: 'rewards', label: 'Rewards', href: '/rewards' },
  { id: 'english', label: 'English Studio', href: '/english' },
  { id: 'guide', label: 'Guide', href: '/guide' },
  { id: 'settings', label: 'Settings', href: '/settings' },
] as const;

export const pilotNavigationIds = new Set([
  'dashboard',
  'content',
  'assignments',
  'progress',
  'settings',
]);
