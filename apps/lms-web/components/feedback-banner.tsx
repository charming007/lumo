type FeedbackTone = 'auto' | 'success' | 'info' | 'warning' | 'error';

function inferTone(message: string): Exclude<FeedbackTone, 'auto'> {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes('failed') ||
    normalized.includes('error') ||
    normalized.includes('unavailable') ||
    normalized.includes('could not') ||
    normalized.includes('unable') ||
    normalized.includes('invalid') ||
    normalized.includes('denied') ||
    normalized.includes('paused')
  ) {
    return 'error';
  }

  if (
    normalized.includes('warning') ||
    normalized.includes('retry') ||
    normalized.includes('check') ||
    normalized.includes('attention')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('updated') ||
    normalized.includes('saved') ||
    normalized.includes('created') ||
    normalized.includes('ready') ||
    normalized.includes('removed') ||
    normalized.includes('captured') ||
    normalized.includes('recorded') ||
    normalized.includes('corrected') ||
    normalized.includes('revoked')
  ) {
    return 'success';
  }

  return 'info';
}

export function FeedbackBanner({ message, tone = 'auto' }: { message?: string; tone?: FeedbackTone }) {
  if (!message) return null;

  const resolvedTone = tone === 'auto' ? inferTone(message) : tone;
  const palette = resolvedTone === 'success'
    ? { background: '#dcfce7', border: '#86efac', text: '#166534' }
    : resolvedTone === 'warning'
      ? { background: '#fff7ed', border: '#fdba74', text: '#9a3412' }
      : resolvedTone === 'error'
        ? { background: '#fef2f2', border: '#fca5a5', text: '#b91c1c' }
        : { background: '#e0e7ff', border: '#a5b4fc', text: '#3730a3' };

  return (
    <div role="status" style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: palette.background, border: `1px solid ${palette.border}`, color: palette.text, fontWeight: 700 }}>
      {message}
    </div>
  );
}
