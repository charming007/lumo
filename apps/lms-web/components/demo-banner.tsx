type Props = {
  role: string;
  mode: string;
  apiSource?: 'env' | 'production-fallback' | 'local-fallback';
};

export function DemoBanner({ role, mode, apiSource = 'env' }: Props) {
  return (
    <div
      style={{
        margin: '16px clamp(16px, 4vw, 32px) 0',
        background: '#111827',
        color: 'white',
        borderRadius: 18,
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        <strong>Lumo pilot demo</strong> — running in {mode} mode
        {apiSource !== 'env' ? (
          <div style={{ marginTop: 4, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
            Backend URL is using the {apiSource === 'production-fallback' ? 'built-in production fallback' : 'local development fallback'}.
          </div>
        ) : null}
      </div>
      <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Current role: {role}</div>
    </div>
  );
}
