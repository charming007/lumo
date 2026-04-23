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

module.exports = {
  slugifyPodSegment,
  buildPodLabelParts,
};
