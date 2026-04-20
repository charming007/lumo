export function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function sanitizeInternalReturnPath(value: string | string[] | undefined, fallback = '/content') {
  const rawValue = normalizeRouteParam(value).trim();

  if (!rawValue) return fallback;
  if (!rawValue.startsWith('/') || rawValue.startsWith('//')) return fallback;

  try {
    const parsed = new URL(rawValue, 'https://lumo.local');
    if (parsed.origin !== 'https://lumo.local') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
