const LOCAL_API_BASE = 'http://localhost:4000';

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

export const API_BASE = configuredApiBase ?? (isProduction ? '' : LOCAL_API_BASE);
export const API_BASE_SOURCE: ApiBaseSource = configuredApiBase
  ? 'env'
  : isProduction
    ? 'missing-production-env'
    : 'local-fallback';
