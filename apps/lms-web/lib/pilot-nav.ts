export const PILOT_BLOCKED_ROUTE_IDS = Object.freeze([
  'devices',
  'canvas',
  'english',
  'students',
  'mallams',
  'pods',
  'attendance',
  'assessments',
  'rewards',
  'reports',
  'guide',
]);

export function isPilotBlockedRoute(routeId: string) {
  return PILOT_BLOCKED_ROUTE_IDS.includes(routeId);
}
