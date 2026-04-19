const LOCAL_API_BASE = 'http://localhost:4000';
const EXPECTED_PRODUCTION_API_BASE = 'https://lumo-api-production-303a.up.railway.app';

export type ApiBaseSource = 'env' | 'local-fallback' | 'missing-production-env' | 'invalid-production-env';

export type ApiBaseDiagnostic = {
  source: ApiBaseSource;
  configuredApiBase: string | null;
  deploymentBlocked: boolean;
  blockerHeadline?: string;
  blockerDetail?: string;
  expectedFormat: string;
};

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveConfiguredApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return configured ? normalizeBaseUrl(configured) : null;
}

function invalidProductionApiReason(value: string | null) {
  if (!value) {
    return 'NEXT_PUBLIC_API_BASE_URL is missing.';
  }

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();
    const looksPlaceholder = hostname === 'example.com' || hostname.endsWith('.example.com');
    const looksLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.endsWith('.local');

    if (protocol !== 'https:') {
      return `NEXT_PUBLIC_API_BASE_URL must use https in production. Current value: ${value}`;
    }

    if (looksPlaceholder) {
      return `NEXT_PUBLIC_API_BASE_URL still points at the placeholder host ${hostname}. Replace it with the real production API before deploying.`;
    }

    if (looksLocal) {
      return `NEXT_PUBLIC_API_BASE_URL points at ${hostname}, which is only reachable from the local machine. Production LMS users would hit a dead backend.`;
    }

    return null;
  } catch {
    return `NEXT_PUBLIC_API_BASE_URL is not a valid URL. Current value: ${value}`;
  }
}

const configuredApiBase = resolveConfiguredApiBaseUrl();
const isProduction = process.env.NODE_ENV === 'production';
const missingProductionApiBase = isProduction && !configuredApiBase;
const invalidProductionReason = isProduction && configuredApiBase
  ? invalidProductionApiReason(configuredApiBase)
  : null;
const productionBlockReason = missingProductionApiBase
  ? 'NEXT_PUBLIC_API_BASE_URL is missing.'
  : invalidProductionReason;

export const API_BASE = isProduction
  ? configuredApiBase ?? LOCAL_API_BASE
  : configuredApiBase ?? LOCAL_API_BASE;

export const API_BASE_SOURCE: ApiBaseSource = missingProductionApiBase
  ? 'missing-production-env'
  : productionBlockReason
    ? 'invalid-production-env'
    : configuredApiBase
      ? 'env'
      : 'local-fallback';

export const API_BASE_DIAGNOSTIC: ApiBaseDiagnostic = {
  source: API_BASE_SOURCE,
  configuredApiBase,
  deploymentBlocked: Boolean(productionBlockReason),
  blockerHeadline: productionBlockReason
    ? missingProductionApiBase
      ? 'Deployment blocker: dashboard API base URL is missing in production.'
      : 'Deployment blocker: dashboard API base URL is unsafe for production.'
    : undefined,
  blockerDetail: productionBlockReason ?? undefined,
  expectedFormat: EXPECTED_PRODUCTION_API_BASE,
};
