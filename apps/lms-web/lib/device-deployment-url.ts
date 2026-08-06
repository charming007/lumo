function shellEscape(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

export function normalizeDeploymentApiBase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const withoutHash = trimmed.split('#', 1)[0] ?? trimmed;
  const withoutQuery = withoutHash.split('?', 1)[0] ?? withoutHash;
  const withScheme = withoutQuery.includes('://') ? withoutQuery : `https://${withoutQuery}`;
  const withoutKnownSuffix = withScheme.replace(/\/api\/v1(?:\/learner-app(?:\/bootstrap)?)?\/?$/i, '');

  return withoutKnownSuffix.replace(/\/+$/, '');
}

export function buildDeviceBootstrapProbe(apiBase: string, deviceIdentifier: string) {
  const base = normalizeDeploymentApiBase(apiBase);
  const probe = new URL(`${base}/api/v1/learner-app/bootstrap`);
  probe.searchParams.set('deviceIdentifier', deviceIdentifier);
  return probe.toString();
}

export function buildDeviceReleaseCommand(apiBase: string, deviceIdentifier: string, buildTarget: 'web' | 'apk' | 'appbundle' | 'ipa') {
  const normalizedApiBase = normalizeDeploymentApiBase(apiBase);

  return [
    'cd apps/learner-tablet && \\',
    '  dart run tool/build_release.dart \\',
    `  --release-target=${shellEscape(buildTarget)} \\`,
    `  --dart-define=LUMO_API_BASE_URL=${shellEscape(normalizedApiBase)} \\`,
    `  --dart-define=LUMO_DEVICE_IDENTIFIER=${shellEscape(deviceIdentifier)}`,
  ].join('\n');
}

export function buildDeviceBootstrapCurl(apiBase: string, deviceIdentifier: string) {
  const base = normalizeDeploymentApiBase(apiBase);
  return [
    `export API_BASE=${shellEscape(base)}`,
    `export DEVICE_IDENTIFIER=${shellEscape(deviceIdentifier)}`,
    "curl -fsS -G \"$API_BASE/api/v1/learner-app/bootstrap\" \\",
    "  --data-urlencode \"deviceIdentifier=$DEVICE_IDENTIFIER\" \\",
    "  -H 'Accept: application/json'",
  ].join('\n');
}
