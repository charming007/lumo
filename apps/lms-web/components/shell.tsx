'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const mobileMenuButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 14,
  padding: '12px 14px',
  background: '#111827',
  color: 'white',
  fontWeight: 800,
  fontSize: 14,
  cursor: 'pointer',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.18)',
};

const SIDEBAR_PREFERENCE_KEY = 'lumo:lms-sidebar-collapsed';

export function AppShell({
  children,
  seedCount = 0,
  buildSignature,
}: {
  children: React.ReactNode;
  seedCount?: number;
  buildSignature: string;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedPreference = window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY);
    if (savedPreference === 'true') {
      setSidebarCollapsed(true);
    }
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
        onCloseMobileNav={() => setMobileNavOpen(false)}
        onToggleSidebarCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <main className="app-shell__content" style={{ minWidth: 0, padding: 'clamp(16px, 3vw, 24px)' }}>
        <button
          type="button"
          className="app-shell__mobile-menu-button"
          style={mobileMenuButtonStyle}
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileNavOpen}
          aria-controls="lumo-sidebar"
        >
          ☰ Menu
        </button>
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapse={() => setSidebarCollapsed((current) => !current)}
          seedCount={seedCount}
          buildSignature={buildSignature}
        />
        {children}
      </main>
      <style>{`
        .app-shell {
          display: grid;
          grid-template-columns: minmax(220px, 278px) minmax(0, 1fr);
          min-height: 100vh;
          background: #f5f7fb;
          transition: grid-template-columns 180ms ease;
        }

        .app-shell--sidebar-collapsed {
          grid-template-columns: 96px minmax(0, 1fr);
        }

        .app-shell__mobile-menu-button {
          display: none;
          margin-bottom: 12px;
        }

        @media (max-width: 960px) {
          .app-shell,
          .app-shell--sidebar-collapsed {
            grid-template-columns: minmax(0, 1fr);
          }

          .app-shell__mobile-menu-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: fit-content;
          }
        }
      `}</style>
    </div>
  );
}
