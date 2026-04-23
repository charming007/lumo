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
