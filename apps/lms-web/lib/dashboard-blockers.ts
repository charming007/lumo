export function shouldBlockDashboardPage(params: {
  criticalDashboardFailureCount: number;
  criticalReleaseFailureCount: number;
  hasCriticalAssetOpsGap: boolean;
  hasEmptyReleaseBoard: boolean;
}) {
  return params.criticalDashboardFailureCount > 0
    || params.criticalReleaseFailureCount > 0
    || params.hasCriticalAssetOpsGap
    || params.hasEmptyReleaseBoard;
}
