export function isPilotControlPlaneEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE === 'true';
}
