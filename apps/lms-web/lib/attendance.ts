export function formatAttendancePercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

export function averageAttendancePercent(values: Array<number | null | undefined>) {
  if (!values.length) return 0;
  const total = values.reduce<number>((sum, value) => sum + (typeof value === 'number' && !Number.isNaN(value) ? value : 0), 0);
  return Math.round((total / values.length) * 100);
}
