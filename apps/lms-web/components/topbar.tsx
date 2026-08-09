import type { BuildSignature } from '../lib/build-signature';
import type { describePilotShellRoute } from '../lib/pilot-shell';
import { describeDashboardStatus } from '../lib/trust-copy';

type TopbarProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  mode?: string;
  seedCount?: number;
  buildSignature: BuildSignature;
  pilotControlPlaneEnabled?: boolean;
  pilotRoute?: ReturnType<typeof describePilotShellRoute>;
};

export function Topbar({
  mode = 'live',
  seedCount = 0,
  buildSignature,
  pilotControlPlaneEnabled = false,
  pilotRoute,
}: TopbarProps) {
  const dashboardStatus = describeDashboardStatus(mode, seedCount);
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
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 14, background: routeCalloutTone.background, border: routeCalloutTone.border, display: 'grid', gap: 5 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: routeCalloutTone.eyebrow, fontWeight: 800 }}>
            {pilotRoute.eyebrow}
          </div>
          <strong style={{ color: routeCalloutTone.title, fontSize: 16 }}>{pilotRoute.title}</strong>
          <div style={{ color: routeCalloutTone.detail, lineHeight: 1.6 }}>{pilotRoute.detail}</div>
        </div>
      ) : null}
      <div className="topbar" style={{ background: 'rgba(255, 255, 255, 0.76)', backdropFilter: 'blur(18px)', borderRadius: 24, padding: '16px 18px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', alignItems: 'center', gap: 14, marginBottom: 18, border: '1px solid rgba(226, 230, 240, 0.92)', boxShadow: '0 18px 52px rgba(76, 83, 112, 0.08)' }}>
        <div className="topbar__brand" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 16, background: 'linear-gradient(135deg, #6D5DF7, #9D8CFF)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, boxShadow: '0 14px 30px rgba(109, 93, 247, 0.24)', flex: '0 0 auto' }}>
            Lu
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#8b93a8', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 850 }}>Operations workspace</div>
            <div style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 900, color: '#151827', overflowWrap: 'normal', wordBreak: 'normal', lineHeight: 1.05 }}>
              {pilotControlPlaneEnabled ? 'Lumo command center' : 'Lumo LMS admin'}
            </div>
          </div>
        </div>
        <div className="topbar__meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start', minWidth: 0 }}>
          {pilotControlPlaneEnabled && pilotRoute ? (
            <div className="topbar__meta-chip" data-route-scope-chip={pilotRoute.status} style={{ background: navStatusChip.background, padding: '8px 11px', borderRadius: 999, fontWeight: 850, color: navStatusChip.color, border: '1px solid rgba(15, 23, 42, 0.06)' }}>
              {navStatusChip.label}
            </div>
          ) : (
            <div className="topbar__meta-chip" style={{ background: '#eefaf1', color: '#2f7a52', padding: '8px 11px', borderRadius: 999, fontWeight: 850, border: '1px solid #d9f0df' }}>
              Full LMS shell live
            </div>
          )}
          <div className="topbar__meta-chip" style={{ background: '#f5f4ff', color: '#5b56c8', padding: '8px 11px', borderRadius: 999, fontWeight: 850, border: '1px solid #dedcff' }} title={buildSignature.summary}>
            Live shell: v{buildSignature.version} · {buildSignature.commitShort} · {buildSignature.deploymentLabel}
          </div>
          <div className="topbar__meta-chip" style={{ background: '#fff5e8', color: '#8b5a19', padding: '8px 11px', borderRadius: 999, fontWeight: 850, border: '1px solid #f1dfc6' }}>{dashboardStatus}</div>
          <div className="topbar__meta-chip" style={{ background: '#6f63ff', color: 'white', padding: '8px 11px', borderRadius: 999, fontWeight: 850, boxShadow: '0 10px 22px rgba(111, 99, 255, 0.20)' }}>Admin</div>
        </div>

        <style>{`
          .topbar__meta-chip { max-width: 100%; overflow-wrap: anywhere; text-align: center; }
          @media (min-width: 980px) {
            .topbar__meta-chip { flex: 0 1 auto; }
          }
          @media (max-width: 720px) {
            .topbar__brand { align-items: flex-start !important; }
            .topbar__meta { width: 100%; justify-content: stretch !important; }
            .topbar__meta-chip { flex: 1 1 100%; }
          }
        `}</style>
      </div>
    </>
  );
}
