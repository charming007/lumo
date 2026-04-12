'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-shell__content" style={{ minWidth: 0, padding: 'clamp(16px, 3vw, 24px)' }}>
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

        @media (max-width: 960px) {
          .app-shell {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
