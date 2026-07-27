'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { BuildSignature } from '../lib/build-signature';
import { describePilotShellRoute } from '../lib/pilot-shell';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const mobileMenuButtonStyle: React.CSSProperties = {
  border: '1px solid #e3e6ef',
  borderRadius: 16,
  padding: '10px 12px',
  background: '#ffffff',
  color: '#202436',
  fontWeight: 800,
  fontSize: 14,
  cursor: 'pointer',
  boxShadow: '0 14px 32px rgba(76, 83, 112, 0.10)',
};

const SIDEBAR_PREFERENCE_KEY = 'lumo:lms-sidebar-collapsed';

export function AppShell({
  children,
  seedCount = 0,
  buildSignature,
  pilotControlPlaneEnabled = false,
  shellScopeDeploymentBlocked = false,
}: {
  children: React.ReactNode;
  seedCount?: number;
  buildSignature: BuildSignature;
  pilotControlPlaneEnabled?: boolean;
  shellScopeDeploymentBlocked?: boolean;
}) {
  const pathname = usePathname() || '/';
  const effectivePilotControlPlaneEnabled = pilotControlPlaneEnabled || shellScopeDeploymentBlocked;
  const pilotRoute = effectivePilotControlPlaneEnabled ? describePilotShellRoute(pathname) : undefined;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedPreference = window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY);
    if (savedPreference === 'true') setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'app-shell--sidebar-collapsed' : ''}`}>
      <Sidebar
        mobileNavOpen={mobileNavOpen}
        sidebarCollapsed={sidebarCollapsed}
        buildSignature={buildSignature}
        pilotControlPlaneEnabled={effectivePilotControlPlaneEnabled}
        onCloseMobileNav={() => setMobileNavOpen(false)}
        onToggleSidebarCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <main className="app-shell__content" style={{ minWidth: 0, padding: 'clamp(18px, 2.5vw, 28px)' }}>
        <button type="button" className="app-shell__mobile-menu-button" style={mobileMenuButtonStyle} onClick={() => setMobileNavOpen(true)} aria-label="Open navigation menu" aria-expanded={mobileNavOpen} aria-controls="lumo-sidebar">
          ☰ Menu
        </button>
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapse={() => setSidebarCollapsed((current) => !current)}
          seedCount={seedCount}
          buildSignature={buildSignature}
          pilotControlPlaneEnabled={effectivePilotControlPlaneEnabled}
          pilotRoute={pilotRoute}
        />
        {children}
      </main>
      <style>{`
        .app-shell { box-sizing: border-box; display: grid; grid-template-columns: minmax(238px, 276px) minmax(0, 1fr); min-height: 100vh; width: 100%; max-width: 100vw; overflow-x: clip; background: radial-gradient(circle at 72% 0%, rgba(169, 146, 255, 0.20), transparent 32%), linear-gradient(135deg, #eef2f7 0%, #f7f4ff 46%, #f2fbf8 100%); transition: grid-template-columns 180ms ease; }
        .app-shell--sidebar-collapsed { grid-template-columns: 96px minmax(0, 1fr); }
        .app-shell__content { box-sizing: border-box; max-width: 100%; width: 100%; overflow-x: clip; }
        .app-shell__mobile-menu-button { display: none; margin-bottom: 12px; }
        @media (max-width: 960px) {
          .app-shell, .app-shell--sidebar-collapsed { grid-template-columns: minmax(0, 1fr); }
          .app-shell__mobile-menu-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: fit-content; }
        }
      `}</style>
    </div>
  );
}
