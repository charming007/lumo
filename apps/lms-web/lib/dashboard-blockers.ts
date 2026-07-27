export function shouldBlockDashboardPage(params: {
  criticalDashboardFailureCount: number;
  criticalReleaseFailureCount: number;
  hasCriticalAssetOpsGap: boolean;
  hasEmptyReleaseBoard: boolean;
  hasDeviceDeploymentGap: boolean;
  hasReleaseGraphMismatch: boolean;
}) {
  return params.criticalDashboardFailureCount > 0
    || params.criticalReleaseFailureCount > 0
    || params.hasCriticalAssetOpsGap
    || params.hasEmptyReleaseBoard
    || params.hasDeviceDeploymentGap
    || params.hasReleaseGraphMismatch;
}
