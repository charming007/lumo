const LOCAL_API_BASE = 'http://localhost:4000';
const PROD_API_BASE = 'https://lumo-api-production-303a.up.railway.app';

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configured) {
    return normalizeBaseUrl(configured);
  }

  return process.env.NODE_ENV === 'production' ? PROD_API_BASE : LOCAL_API_BASE;
}

export const API_BASE = resolveApiBaseUrl();
export const API_BASE_SOURCE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  ? 'env'
  : process.env.NODE_ENV === 'production'
    ? 'production-fallback'
    : 'local-fallback';
