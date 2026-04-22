type LegacySearchParams =
  | Promise<Record<string, string | string[] | undefined> | undefined>
  | Record<string, string | string[] | undefined>
  | undefined;

export async function buildLegacyRedirectTarget(
  targetPath: string,
  searchParams?: LegacySearchParams,
) {
  const resolved = searchParams instanceof Promise ? await searchParams : searchParams;
  const params = new URLSearchParams();

  Object.entries(resolved ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value
        .map((item) => item?.trim())
        .filter(Boolean)
        .forEach((item) => params.append(key, item));
      return;
    }

    const normalized = value?.trim();
    if (normalized) {
      params.set(key, normalized);
    }
  });

  const query = params.toString();
  return query ? `${targetPath}?${query}` : targetPath;
}
