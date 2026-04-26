function slugifyPodSegment(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\'’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function buildPodLabelParts({ stateName, localGovernmentName, podName } = {}) {
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

function parseCanonicalPodLabel(label) {
  const normalized = String(label || '').trim().toLowerCase();
  if (!normalized) return null;

  const parts = normalized.split('-').filter(Boolean);
  if (parts.length < 3) return null;

  return {
    stateSegment: parts[0],
    localGovernmentSegment: parts[1],
    podSegment: parts.slice(2).join('-'),
  };
}

module.exports = {
  slugifyPodSegment,
  buildPodLabelParts,
  parseCanonicalPodLabel,
};
