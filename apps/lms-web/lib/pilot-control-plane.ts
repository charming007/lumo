function normalizePilotControlPlaneFlag(value: string | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

export function isPilotControlPlaneEnabled() {
  const explicitFlag = normalizePilotControlPlaneFlag(process.env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE);

  if (explicitFlag === 'true') return true;
  if (explicitFlag === 'false') return false;

  return process.env.NODE_ENV === 'production';
}
