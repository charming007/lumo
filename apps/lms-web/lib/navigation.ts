export const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/' },
  { id: 'content', label: 'Content Library', href: '/content' },
  { id: 'assignments', label: 'Assignments', href: '/assignments' },
  { id: 'progress', label: 'Progress', href: '/progress' },
  { id: 'settings', label: 'Settings', href: '/settings' },
] as const;

export const pilotDeferredRouteLabels = {
  canvas: 'Curriculum Canvas',
  students: 'Learners',
  mallams: 'Mallams',
  pods: 'Pods',
  attendance: 'Attendance',
  assessments: 'Assessments',
  reports: 'Reports',
  rewards: 'Rewards',
  english: 'English Studio',
  guide: 'Guide',
} as const;
