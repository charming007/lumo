import React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fb' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 24 }}>
        <Topbar />
        {children}
      </main>
    </div>
  );
}
