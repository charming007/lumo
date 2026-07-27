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

    if (parsed.pathname === '/canvas') {
      const nextParams = new URLSearchParams();
      const subject = parsed.searchParams.get('subject')?.trim() ?? '';
      const moduleId = parsed.searchParams.get('module')?.trim() ?? '';
      const search = parsed.searchParams.get('q')?.trim() ?? '';
      const readiness = parsed.searchParams.get('readiness')?.trim().toLowerCase() ?? '';

      if (subject) nextParams.set('subject', subject);
      if (moduleId) nextParams.set('moduleId', moduleId);
      if (search) nextParams.set('q', search);
      if (readiness === 'blocked') nextParams.set('view', 'blocked');
      if (readiness === 'ready') nextParams.set('status', 'published');
      if (readiness === 'watch') nextParams.set('status', 'draft');

      return nextParams.size ? `/content?${nextParams.toString()}` : '/content';
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
