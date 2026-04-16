type TopbarProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
};

const desktopSidebarToggleStyle: React.CSSProperties = {
  border: '1px solid #d7deea',
  background: '#ffffff',
  color: '#0f172a',
  borderRadius: 14,
  padding: '10px 14px',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
};

export function Topbar({ sidebarCollapsed = false, onToggleSidebarCollapse }: TopbarProps) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="topbar__sidebar-toggle"
          style={desktopSidebarToggleStyle}
          onClick={onToggleSidebarCollapse}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          aria-controls="lumo-sidebar"
        >
          {sidebarCollapsed ? '⇥ Expand nav' : '⇤ Collapse nav'}
        </button>
        <div>
          <div style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Welcome back</div>
          <div style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 900, color: '#0f172a' }}>Lumo command center</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: 14, fontWeight: 700, color: '#0f172a' }}>Northern Nigeria pilot</div>
        <div style={{ background: '#fef3c7', color: '#92400e', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }}>Verify dashboard feed status</div>
        <div style={{ background: '#6C63FF', color: 'white', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }}>Admin</div>
      </div>

      <style jsx>{`
        .topbar__sidebar-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        @media (max-width: 960px) {
          .topbar__sidebar-toggle {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
