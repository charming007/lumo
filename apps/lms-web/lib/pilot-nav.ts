export const PILOT_BLOCKED_ROUTES = Object.freeze([
  { id: 'devices', label: 'Devices' },
  { id: 'canvas', label: 'Curriculum Canvas' },
  { id: 'english', label: 'English Studio' },
  { id: 'students', label: 'Learners' },
  { id: 'mallams', label: 'Mallams' },
  { id: 'pods', label: 'Pods' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'reports', label: 'Reports' },
  { id: 'guide', label: 'Guide' },
]);

export const PILOT_BLOCKED_ROUTE_IDS = Object.freeze(
  PILOT_BLOCKED_ROUTES.map((route) => route.id),
);

export const PILOT_BLOCKED_ROUTE_LABELS = Object.freeze(
  PILOT_BLOCKED_ROUTES.map((route) => route.label),
);

export function isPilotBlockedRoute(routeId: string) {
  return PILOT_BLOCKED_ROUTE_IDS.includes(routeId);
}
