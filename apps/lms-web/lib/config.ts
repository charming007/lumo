const LOCAL_API_BASE = 'http://localhost:4000';
const DISABLED_PRODUCTION_API_BASE = 'http://127.0.0.1:9';

export type ApiBaseSource = 'env' | 'local-fallback' | 'missing-production-env';

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveConfiguredApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return configured ? normalizeBaseUrl(configured) : null;
}

const configuredApiBase = resolveConfiguredApiBaseUrl();
const isProduction = process.env.NODE_ENV === 'production';
const isMissingProductionApiBase = isProduction && !configuredApiBase;

if (isMissingProductionApiBase) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL is required for production builds. Refusing to ship a disconnected LMS admin shell.',
  );
}

export const API_BASE = configuredApiBase ?? (isMissingProductionApiBase ? DISABLED_PRODUCTION_API_BASE : LOCAL_API_BASE);

export const API_BASE_SOURCE: ApiBaseSource = configuredApiBase
  ? 'env'
  : isMissingProductionApiBase
    ? 'missing-production-env'
    : 'local-fallback';
