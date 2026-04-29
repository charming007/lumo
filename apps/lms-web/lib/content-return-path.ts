export function normalizeFilterValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function buildContentReturnPath(query?: { q?: string | string[]; subject?: string | string[]; status?: string | string[]; view?: string | string[] }) {
  const params = new URLSearchParams();
  const q = normalizeFilterValue(query?.q).trim();
  const subject = normalizeFilterValue(query?.subject).trim();
  const status = normalizeFilterValue(query?.status).trim();
  const view = normalizeFilterValue(query?.view).trim();

  if (q) params.set('q', q);
  if (subject) params.set('subject', subject);
  if (status) params.set('status', status);
  if (view) params.set('view', view);

  return params.size ? `/content?${params.toString()}` : '/content';
}

export function buildScopedLessonCreateHref({
  subjectId,
  moduleId,
  returnPath,
  focus = 'blockers',
}: {
  subjectId: string;
  moduleId: string;
  returnPath: string;
  focus?: string;
}) {
  const params = new URLSearchParams({
    subjectId,
    moduleId,
    from: returnPath,
  });

  if (focus.trim()) {
    params.set('focus', focus.trim());
  }

  return `/content/lessons/new?${params.toString()}`;
}

export function buildReviewBlockersHref(returnPath: string) {
  if (!returnPath.startsWith('/content')) {
    return '/content?view=blocked';
  }

  const [pathname, query = ''] = returnPath.split('?', 2);
  const params = new URLSearchParams(query);
  params.set('view', 'blocked');

  return params.size ? `${pathname}?${params.toString()}` : pathname;
}
