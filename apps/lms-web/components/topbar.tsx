import type { BuildSignature } from '../lib/build-signature';
import type { describePilotShellRoute } from '../lib/pilot-shell';
import { describeDashboardStatus } from '../lib/trust-copy';

type TopbarProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  seedCount?: number;
  buildSignature: BuildSignature;
  pilotControlPlaneEnabled?: boolean;
  pilotRoute?: ReturnType<typeof describePilotShellRoute>;
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

export function Topbar({
  sidebarCollapsed = false,
  onToggleSidebarCollapse,
  seedCount = 0,
  buildSignature,
  pilotControlPlaneEnabled = false,
  pilotRoute,
}: TopbarProps) {
  const dashboardStatus = describeDashboardStatus(seedCount);
  const routeCalloutTone = pilotRoute?.status === 'visible'
    ? { background: '#ECFDF5', border: '1px solid #BBF7D0', eyebrow: '#166534', title: '#14532D', detail: '#166534' }
    : pilotRoute?.status === 'blocked'
      ? { background: '#EEF2FF', border: '1px solid #C7D2FE', eyebrow: '#3730A3', title: '#312E81', detail: '#4338CA' }
      : pilotRoute?.status === 'off-shell'
        ? { background: '#FFF7ED', border: '1px solid #FED7AA', eyebrow: '#9A3412', title: '#7C2D12', detail: '#9A3412' }
        : { background: '#F8FAFC', border: '1px solid #CBD5E1', eyebrow: '#475569', title: '#0F172A', detail: '#475569' };
  const navStatusChip = pilotRoute?.status === 'visible'
    ? { label: 'Pilot nav locked', background: '#f1f5f9', color: '#0f172a' }
    : pilotRoute?.status === 'off-shell'
      ? { label: 'Outside pilot shell', background: '#FFF7ED', color: '#9A3412' }
      : pilotRoute?.status === 'blocked'
        ? { label: 'Blocked pilot surface', background: '#EEF2FF', color: '#3730A3' }
        : { label: 'Unclassified route', background: '#E2E8F0', color: '#334155' };

  return (
    <>
      {pilotControlPlaneEnabled && pilotRoute ? (
        <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: 18, background: routeCalloutTone.background, border: routeCalloutTone.border, display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: routeCalloutTone.eyebrow, fontWeight: 800 }}>
            {pilotRoute.eyebrow}
          </div>
          <strong style={{ color: routeCalloutTone.title, fontSize: 16 }}>{pilotRoute.title}</strong>
          <div style={{ color: routeCalloutTone.detail, lineHeight: 1.6 }}>{pilotRoute.detail}</div>
        </div>
      ) : null}
      <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)', borderRadius: 28, padding: 'clamp(16px, 4vw, 22px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20, border: '1px solid #e8edf5', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0, flex: '1 1 280px' }}>
          <button type="button" className="topbar__sidebar-toggle" style={desktopSidebarToggleStyle} onClick={onToggleSidebarCollapse} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!sidebarCollapsed} aria-controls="lumo-sidebar">
            {sidebarCollapsed ? '⇥ Expand nav' : '⇤ Collapse nav'}
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Welcome back</div>
            <div style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 900, color: '#0f172a', overflowWrap: 'anywhere' }}>
              {pilotControlPlaneEnabled ? 'Lumo command center' : 'Lumo LMS admin'}
            </div>
          </div>
        </div>
        <div className="topbar__meta" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 0, flex: '1 1 280px' }}>
          {pilotControlPlaneEnabled && pilotRoute ? (
            <div className="topbar__meta-chip" data-route-scope-chip={pilotRoute.status} style={{ background: navStatusChip.background, padding: '10px 14px', borderRadius: 14, fontWeight: 700, color: navStatusChip.color }}>
              {navStatusChip.label}
            </div>
          ) : (
            <div className="topbar__meta-chip" style={{ background: '#ECFDF5', color: '#166534', padding: '10px 14px', borderRadius: 14, fontWeight: 700 }}>
              Full LMS shell live
            </div>
          )}
          <div className="topbar__meta-chip" style={{ background: '#eef2ff', color: '#3730a3', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }} title={buildSignature.summary}>
            Live shell: v{buildSignature.version} · {buildSignature.commitShort} · {buildSignature.deploymentLabel}
          </div>
          <div className="topbar__meta-chip" style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }}>{dashboardStatus}</div>
          <div className="topbar__meta-chip" style={{ background: '#6C63FF', color: 'white', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }}>Admin</div>
        </div>

        <style>{`
          .topbar__sidebar-toggle { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
          .topbar__meta-chip { max-width: 100%; overflow-wrap: anywhere; text-align: center; }
          @media (max-width: 960px) { .topbar__sidebar-toggle { display: none; } }
          @media (max-width: 720px) {
            .topbar__meta { width: 100%; justify-content: stretch; }
            .topbar__meta-chip { flex: 1 1 100%; }
          }
        `}</style>
      </div>
    </>
  );
}
