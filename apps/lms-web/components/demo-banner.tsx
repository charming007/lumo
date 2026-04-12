type Props = {
  role: string;
  mode: string;
  apiSource?: 'env' | 'production-fallback' | 'local-fallback';
};

export function DemoBanner({ role, mode, apiSource = 'env' }: Props) {
  return (
    <div
      style={{
        margin: '0 32px',
        marginTop: 16,
        background: '#111827',
        color: 'white',
        borderRadius: 18,
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <strong>Lumo pilot demo</strong> — running in {mode} mode
        {apiSource !== 'env' ? (
          <div style={{ marginTop: 4, fontSize: 13, color: '#cbd5e1' }}>
            Backend URL is using the {apiSource === 'production-fallback' ? 'built-in production fallback' : 'local development fallback'}.
          </div>
        ) : null}
      </div>
      <div>Current role: {role}</div>
    </div>
  );
}
