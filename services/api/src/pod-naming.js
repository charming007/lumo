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

function extractPodShortNameFromLabel(label) {
  const normalized = String(label || '').trim();
  const segments = normalized.split('-');
  let suffix = segments.length > 2 ? segments.slice(2).join('-') : normalized;

  if (segments.length <= 2) {
    const podIndex = normalized.toLowerCase().indexOf('pod ');
    if (podIndex > 0) suffix = normalized.slice(podIndex);
  }

  return suffix.replace(/_/g, ' ').trim();
}

function buildTabletIdentifier({ podLabel, tabletName } = {}) {
  const podSegment = slugifyPodSegment(podLabel || 'pod');
  const tabletSegment = slugifyPodSegment(tabletName || 'tablet');
  return [podSegment, tabletSegment].filter(Boolean).join('-');
}

function extractTabletNameFromIdentifier(deviceIdentifier, podLabel = '') {
  const normalizedIdentifier = String(deviceIdentifier || '').trim();
  const normalizedPodLabel = slugifyPodSegment(podLabel || '');

  if (!normalizedIdentifier) return '';

  const suffix = normalizedPodLabel && normalizedIdentifier.startsWith(`${normalizedPodLabel}-`)
    ? normalizedIdentifier.slice(normalizedPodLabel.length + 1)
    : normalizedIdentifier.split('-').slice(1).join('-');

  return String(suffix || '').replace(/_/g, ' ').trim();
}

module.exports = {
  slugifyPodSegment,
  buildPodLabelParts,
  extractPodShortNameFromLabel,
  buildTabletIdentifier,
  extractTabletNameFromIdentifier,
};
