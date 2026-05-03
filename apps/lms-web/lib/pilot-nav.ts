export const pilotNavMode = 'full-admin' as const;

const RETIRED_PILOT_ROUTE_REDIRECTS = Object.freeze({});

export function redirectIfPilotHiddenRoute(_pathname: string) {
  return RETIRED_PILOT_ROUTE_REDIRECTS;
}
