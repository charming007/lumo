const subjectColors = {
  english: '#6C63FF',
  math: '#22C55E',
  'life-skills': '#F59E0B',
};

function percentage(value) {
  return `${Math.round(value * 100)}%`;
}

module.exports = {
  subjectColors,
  percentage,
};
