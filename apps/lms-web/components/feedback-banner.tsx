export function FeedbackBanner({ message, tone = 'success' }: { message?: string; tone?: 'success' | 'info' }) {
  if (!message) return null;

  const palette = tone === 'success'
    ? { background: '#dcfce7', border: '#86efac', text: '#166534' }
    : { background: '#e0e7ff', border: '#a5b4fc', text: '#3730a3' };

  return (
    <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 16, background: palette.background, border: `1px solid ${palette.border}`, color: palette.text, fontWeight: 700 }}>
      {message}
    </div>
  );
}
