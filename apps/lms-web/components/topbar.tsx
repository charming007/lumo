export function Topbar() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
        borderRadius: 28,
        padding: '18px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
        border: '1px solid #e8edf5',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Welcome back</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>Lumo command center</div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: 14, fontWeight: 700, color: '#0f172a' }}>Northern Nigeria pilot</div>
        <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }}>Sync healthy</div>
        <div style={{ background: '#6C63FF', color: 'white', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }}>Admin</div>
      </div>
    </div>
  );
}
