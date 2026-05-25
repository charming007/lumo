const DEFAULT_STATUS = 'on-track';

export function normalizeProgressionStatus(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase() ?? '';
  return normalized || DEFAULT_STATUS;
}

export function formatProgressionStatusLabel(status: string | null | undefined) {
  const normalized = normalizeProgressionStatus(status);
  if (normalized === 'on-track') return 'on track';
  return normalized;
}

export function progressionStatusTone(status: string | null | undefined) {
  const normalized = normalizeProgressionStatus(status);
  if (normalized === 'ready') return { tone: '#DCFCE7', text: '#166534' };
  if (normalized === 'watch') return { tone: '#FEF3C7', text: '#92400E' };
  return { tone: '#E0E7FF', text: '#3730A3' };
}
