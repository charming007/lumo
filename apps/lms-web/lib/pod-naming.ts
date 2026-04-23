export function slugifyPodSegment(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function buildPodLabelParts({
  stateName,
  localGovernmentName,
  podName,
}: {
  stateName?: string | null;
  localGovernmentName?: string | null;
  podName?: string | null;
}) {
  const stateSegment = slugifyPodSegment(stateName || 'state');
  const localGovernmentSegment = slugifyPodSegment(localGovernmentName || 'lg');
  const podSegment = slugifyPodSegment(podName || 'pod');

  return {
    stateSegment,
    localGovernmentSegment,
    podSegment,
    label: [stateSegment, localGovernmentSegment, podSegment].filter(Boolean).join('-'),
  };
}

export function extractPodShortNameFromLabel(label?: string | null) {
  const normalized = String(label || '').trim();
  const segments = normalized.split('-');
  let suffix = segments.length > 2 ? segments.slice(2).join('-') : normalized;

  if (segments.length <= 2) {
    const podIndex = normalized.toLowerCase().indexOf('pod ');
    if (podIndex > 0) suffix = normalized.slice(podIndex);
  }

  if (!suffix) return '';
  return suffix
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
