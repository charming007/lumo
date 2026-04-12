'use client';

import React, { useState } from 'react';
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar mobileNavOpen={mobileNavOpen} onCloseMobileNav={() => setMobileNavOpen(false)} />
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
        <Topbar />
        {children}
      </main>
      <style jsx>{`
        .app-shell {
          display: grid;
          grid-template-columns: minmax(220px, 278px) minmax(0, 1fr);
          min-height: 100vh;
          background: #f5f7fb;
        }

        .app-shell__mobile-menu-button {
          display: none;
          margin-bottom: 12px;
        }

        @media (max-width: 960px) {
          .app-shell {
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
