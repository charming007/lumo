import { usePathname } from 'next/navigation';
import type { BuildSignature } from '../lib/build-signature';
import { describeDashboardStatus } from '../lib/trust-copy';

type TopbarProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  seedCount?: number;
  buildSignature: BuildSignature;
};

function isLessonAuthoringPath(pathname: string) {
  return pathname === '/content/lessons/new' || pathname.startsWith('/content/lessons/');
}

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
}: TopbarProps) {
  const pathname = usePathname();
  const lessonAuthoringRoute = isLessonAuthoringPath(pathname);
  const dashboardStatus = describeDashboardStatus(seedCount);
  const workspaceLabel = lessonAuthoringRoute ? 'Lesson Studio workspace' : 'Admin workspace';
  const workspaceTitle = lessonAuthoringRoute ? 'Lesson Studio shell' : 'Lumo admin shell';
  const roleChip = lessonAuthoringRoute ? 'Authoring' : 'Admin';

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
        borderRadius: 28,
        padding: 'clamp(16px, 4vw, 22px)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0, flex: '1 1 280px' }}>
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
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{workspaceLabel}</div>
          <div style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 900, color: '#0f172a', overflowWrap: 'anywhere' }}>{workspaceTitle}</div>
        </div>
      </div>
      <div className="topbar__meta" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 0, flex: '1 1 280px' }}>
        <div className="topbar__meta-chip" style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: 14, fontWeight: 700, color: '#0f172a' }}>{workspaceLabel}</div>
        <div className="topbar__meta-chip" style={{ background: '#eef2ff', color: '#3730a3', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }} title={buildSignature.summary}>
          Live shell: v{buildSignature.version} · {buildSignature.commitShort} · {buildSignature.deploymentLabel}
        </div>
        <div className="topbar__meta-chip" style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }}>{dashboardStatus}</div>
        <div className="topbar__meta-chip" style={{ background: '#6C63FF', color: 'white', padding: '10px 14px', borderRadius: 14, fontWeight: 800 }}>{roleChip}</div>
      </div>

      <style>{`
        .topbar__sidebar-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .topbar__meta-chip {
          max-width: 100%;
          overflow-wrap: anywhere;
          text-align: center;
        }


        @media (max-width: 960px) {
          .topbar__sidebar-toggle {
            display: none;
          }
        }

        @media (max-width: 720px) {
          .topbar__meta {
            width: 100%;
            justify-content: stretch;
          }

          .topbar__meta-chip {
            flex: 1 1 100%;
          }

        }
      `}</style>
    </div>
  );
}
