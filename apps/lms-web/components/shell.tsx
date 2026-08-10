'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { BuildSignature } from '../lib/build-signature';
import { describePilotShellRoute } from '../lib/pilot-shell';
import { DeploymentBlockerCard } from './deployment-blocker-card';
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
  banners,
  mode = 'live',
  seedCount = 0,
  buildSignature,
  pilotControlPlaneEnabled = false,
  shellScopeDeploymentBlocked = false,
}: {
  children: React.ReactNode;
  banners?: React.ReactNode;
  mode?: string;
  seedCount?: number;
  buildSignature: BuildSignature;
  pilotControlPlaneEnabled?: boolean;
  shellScopeDeploymentBlocked?: boolean;
}) {
  const pathname = usePathname() || '/';
  const effectivePilotControlPlaneEnabled = pilotControlPlaneEnabled || shellScopeDeploymentBlocked;
  const pilotRoute = effectivePilotControlPlaneEnabled ? describePilotShellRoute(pathname) : undefined;
  const rootScopeDeploymentBlocked = Boolean(shellScopeDeploymentBlocked && pathname === '/');
  const routeScopeDeploymentBlocked = Boolean(
    shellScopeDeploymentBlocked
    && pathname !== '/'
    && pilotRoute
    && pilotRoute.status !== 'visible',
  );
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

  if (rootScopeDeploymentBlocked) {
    return (
      <main style={{ minHeight: '100vh', padding: 'clamp(18px, 2.5vw, 28px)' }}>
        {children}
      </main>
    );
  }

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
        {banners}
        {routeScopeDeploymentBlocked && pilotRoute ? (
          <DeploymentBlockerCard
            title={pilotRoute.routeLabel}
            subtitle="This route is blocked during production deployment review because the pilot control plane is narrowed and this surface sits outside it."
            blockerHeadline={`Deployment blocker: ${pilotRoute.routeLabel} sits outside the pilot control plane.`}
            blockerDetail={(
              <>
                Production is intentionally clamped back to the pilot-safe shell right now. Letting <strong>{pilotRoute.routeLabel}</strong> keep rendering by direct URL would still widen the deployment target even if the sidebar hides the link. Use the visible pilot routes for review, or re-enable the full LMS shell deliberately before treating this route as deployable.
              </>
            )}
            whyBlocked={[
              'Hiding the wider route from navigation is not enough. If a bookmarked or pasted URL still opens the full UI, deployment review scope is still wider than the shell claims.',
              'This keeps production reviewers from mistaking an internal admin surface for a pilot-approved workflow just because it shares the same host and chrome.',
              'If the team truly wants this route live in production review, the pilot control plane should be widened intentionally instead of leaking through direct links.',
            ]}
            verificationItems={[
              {
                surface: `${pilotRoute.routeLabel} direct URL`,
                expected: 'Shows a deployment blocker while the pilot control plane is narrowed',
                failure: 'Opens the full admin UI even though production review is supposed to be limited to pilot-safe routes',
              },
              {
                surface: 'Sidebar navigation',
                expected: 'Only pilot-safe routes remain visible in the shared shell',
                failure: 'Wider admin surfaces appear reachable as first-class production navigation',
              },
              {
                surface: 'Pilot deployment contract',
                expected: 'Dashboard, Content, Assignments, Progress, and Settings stay as the only reviewable routes',
                failure: 'A direct link silently widens deployment review scope beyond the pilot control plane',
              },
            ]}
            fixItems={[
              { label: 'Frontend build', value: buildSignature.summary },
              { label: 'Blocked route', value: `${pilotRoute.routeLabel} (${pathname})` },
              { label: 'Route scope', value: pilotRoute.status === 'blocked' ? 'Explicitly blocked pilot surface' : pilotRoute.status === 'off-shell' ? 'Specialist route outside pilot shell' : 'Route outside pilot deployment scope' },
              { label: 'Operator action', value: 'Stay on the pilot-safe routes for deployment review, or deliberately re-enable the full LMS shell before using this surface in production' },
              { label: 'Cross-check', value: 'Verify Dashboard, Content, Assignments, Progress, and Settings remain the only reviewable routes in this deployment mode' },
            ]}
            docs={[
              { label: 'Open dashboard', href: '/', background: '#111827', color: '#FFFFFF', border: '1px solid #1F2937' },
              { label: 'Open content', href: '/content', background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' },
              { label: 'Open assignments', href: '/assignments', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' },
              { label: 'Open settings', href: '/settings', background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' },
            ]}
          />
        ) : children}
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
