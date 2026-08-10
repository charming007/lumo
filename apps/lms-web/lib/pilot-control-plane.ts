function normalizePilotControlPlaneFlag(value: string | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

export function getPilotControlPlaneFlagMode() {
  const explicitFlag = normalizePilotControlPlaneFlag(process.env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE);

  if (explicitFlag === 'true') return 'enabled' as const;
  if (explicitFlag === 'false') return 'disabled' as const;

  return 'default' as const;
}

export function isPilotControlPlaneEnabled() {
  const flagMode = getPilotControlPlaneFlagMode();

  if (flagMode === 'enabled') return true;
  if (flagMode === 'disabled') return false;

  return process.env.NODE_ENV === 'production';
}

export function isShellScopeDeploymentBlocked() {
  return process.env.NODE_ENV === 'production' && isPilotControlPlaneEnabled();
}
