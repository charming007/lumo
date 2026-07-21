'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { BuildSignature } from '../lib/build-signature';
import { getNavigationItems } from '../lib/navigation';
import { PILOT_BLOCKED_ROUTE_LABELS } from '../lib/pilot-nav';

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemMonogram(label: string) {
  return label.trim()[0]?.toUpperCase() ?? '';
}

const navigationGroups = [
  {
    label: 'Operations',
    ids: new Set(['dashboard', 'students', 'mallams', 'pods', 'devices', 'attendance']),
  },
  {
    label: 'Curriculum',
    ids: new Set(['content', 'english', 'canvas', 'assessments', 'assignments', 'progress']),
  },
  {
    label: 'Support',
    ids: new Set(['rewards', 'reports', 'guide', 'settings']),
  },
] as const;

type SidebarProps = {
  mobileNavOpen?: boolean;
  sidebarCollapsed?: boolean;
  buildSignature: BuildSignature;
  pilotControlPlaneEnabled?: boolean;
  onCloseMobileNav?: () => void;
  onToggleSidebarCollapse?: () => void;
};

export function Sidebar({
  mobileNavOpen = false,
  sidebarCollapsed = false,
  buildSignature,
  pilotControlPlaneEnabled = false,
  onCloseMobileNav,
  onToggleSidebarCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const safePathname = pathname || '';
  const previousPathnameRef = useRef(safePathname);
  const navigationItems = getNavigationItems(pilotControlPlaneEnabled);

  useEffect(() => {
    if (previousPathnameRef.current !== safePathname && mobileNavOpen) {
      onCloseMobileNav?.();
    }

    previousPathnameRef.current = safePathname;
  }, [safePathname, mobileNavOpen, onCloseMobileNav]);

  const blockedPilotSurfaceCount = PILOT_BLOCKED_ROUTE_LABELS.length;
  const shellLabel = pilotControlPlaneEnabled ? 'Pilot workspace' : 'Admin workspace';
  const shellHeadline = pilotControlPlaneEnabled ? 'Pilot-ready routes' : 'Education operations';
  const shellDetail = pilotControlPlaneEnabled
    ? 'Dashboard, content, assignments, progress, and settings are visible for pilot go-live.'
    : blockedPilotSurfaceCount
      ? `Core admin routes are visible, but ${blockedPilotSurfaceCount} pilot-deferred surfaces still hard-block on their own routes.`
      : 'Learners, facilitators, pods, devices, curriculum, assessment, assignments, and reporting in one focused shell.';
  const brandDetail = pilotControlPlaneEnabled
    ? 'Pilot control plane for curriculum readiness and learner progress.'
    : blockedPilotSurfaceCount
      ? 'Field learning operations and curriculum delivery, with deferred pilot surfaces called out instead of pretending every nav item ships today.'
      : 'Field learning operations and curriculum delivery.';
  const footerTitle = pilotControlPlaneEnabled ? 'Pilot workspace' : 'Full LMS shell';
  const footerDetail = pilotControlPlaneEnabled
    ? 'Visible routes stay limited to the pilot control plane.'
    : blockedPilotSurfaceCount
      ? `Shared chrome is live, but ${blockedPilotSurfaceCount} pilot-deferred routes still open explicit blocker pages.`
      : 'All admin routes stay available; this redesign only changes presentation.';
  const groupedNavigationItems = navigationGroups
    .map((group) => ({
      ...group,
      items: navigationItems.filter((item) => group.ids.has(item.id)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onCloseMobileNav}
          style={{
            position: 'fixed',
            inset: 0,
            border: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            zIndex: 30,
            cursor: 'pointer',
          }}
        />
      ) : null}
      <aside
        key={`sidebar-${buildSignature.commitShort}`}
        id="lumo-sidebar"
        className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''} ${sidebarCollapsed ? 'sidebar--collapsed' : ''}`}
        aria-label="Primary navigation"
        style={{
          minWidth: 0,
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfcff 100%)',
          color: '#202436',
          padding: 'clamp(18px, 3vw, 22px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          borderRight: '1px solid rgba(222, 226, 235, 0.9)',
          boxShadow: '18px 0 45px rgba(76, 83, 112, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div className="sidebar__brand-copy">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="sidebar__brand-mark" aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7468ff 0%, #9b7cff 100%)', color: '#ffffff', fontSize: 16, fontWeight: 900, boxShadow: '0 16px 34px rgba(116, 104, 255, 0.25)' }}>Lu</div>
              <div className="sidebar__brand-text">
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0, color: '#151827' }}>Lumo</div>
                <div style={{ color: '#8b93a8', fontSize: 12, fontWeight: 750 }}>LMS admin</div>
              </div>
            </div>
            <div className="sidebar__brand-detail" style={{ color: '#7b8498', marginTop: 12, lineHeight: 1.5, fontSize: 13 }}>
              {brandDetail}
            </div>
          </div>
          <div className="sidebar__actions">
            <button type="button" className="sidebar__collapse-toggle" onClick={onToggleSidebarCollapse} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!sidebarCollapsed} aria-controls="lumo-sidebar" style={{ border: '1px solid #e2e6ef', background: '#ffffff', color: '#5d6679', width: 38, height: 38, borderRadius: 14, cursor: 'pointer', fontSize: 14, fontWeight: 900, boxShadow: '0 12px 24px rgba(76, 83, 112, 0.08)' }}>
              {sidebarCollapsed ? '>' : '<'}
            </button>
            <button type="button" className="sidebar__close" onClick={onCloseMobileNav} aria-label="Close navigation menu" style={{ border: '1px solid #e2e6ef', background: '#ffffff', color: '#5d6679', width: 38, height: 38, borderRadius: 14, cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>
              ×
            </button>
          </div>
        </div>

        <div className="sidebar__callout" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #eef7ff 100%)', border: '1px solid #e4e0ff', borderRadius: 22, padding: 16, boxShadow: '0 16px 38px rgba(116, 104, 255, 0.10)' }}>
          <div style={{ color: '#7d75d9', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 900 }}>{shellLabel}</div>
          <div style={{ marginTop: 6, fontSize: 19, fontWeight: 900, color: '#22233d' }}>{shellHeadline}</div>
          <div className="sidebar__callout-detail" style={{ marginTop: 6, color: '#6b7285', fontSize: 13, lineHeight: 1.55 }}>{shellDetail}</div>
        </div>

        <nav style={{ display: 'grid', gap: 18 }}>
          {groupedNavigationItems.map((group) => (
            <div key={group.label} className="sidebar__nav-group" style={{ display: 'grid', gap: 7 }}>
              <div className="sidebar__nav-group-label" style={{ color: '#9aa2b5', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: 900, padding: '0 8px' }}>{group.label}</div>
              {group.items.map((item) => {
                const active = isActivePath(safePathname, item.href);
                const monogram = itemMonogram(item.label);
                return (
                  <Link key={item.id} href={item.href} prefetch={false} data-nav-id={item.id} data-nav-href={item.href} aria-label={sidebarCollapsed ? item.label : undefined} title={sidebarCollapsed ? item.label : undefined} className={`sidebar__nav-link ${sidebarCollapsed ? 'sidebar__nav-link--collapsed' : ''}`} style={{ textDecoration: 'none', color: active ? '#ffffff' : '#5f687a', padding: '11px 12px', borderRadius: 16, background: active ? 'linear-gradient(135deg, #7166ff 0%, #8c7bff 100%)' : 'transparent', fontWeight: active ? 900 : 760, border: active ? '1px solid rgba(113, 102, 255, 0.15)' : '1px solid transparent', boxShadow: active ? '0 16px 34px rgba(113, 102, 255, 0.22)' : 'none' }}>
                    <span className="sidebar__nav-icon" aria-hidden="true"><span className="sidebar__nav-icon-text">{monogram}</span></span>
                    <span className="sidebar__nav-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span>{item.label}</span></span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer" style={{ marginTop: 'auto', background: '#ffffff', borderRadius: 22, padding: 15, border: '1px solid #e7ebf3', boxShadow: '0 16px 36px rgba(76, 83, 112, 0.07)' }}>
          <div style={{ fontWeight: 900, marginBottom: 6, color: '#202436' }}>{footerTitle}</div>
          <div className="sidebar__footer-detail" style={{ color: '#7b8498', fontSize: 13, lineHeight: 1.5 }}>{footerDetail}</div>
          <div className="sidebar__footer-build" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eef1f6', display: 'grid', gap: 4 }}>
            <div style={{ color: '#7166ff', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 900 }}>{pilotControlPlaneEnabled ? 'Pilot build signal' : 'Live build signal'}</div>
            <div style={{ color: '#202436', fontSize: 13, fontWeight: 850 }}>v{buildSignature.version} · {buildSignature.commitShort}</div>
            <div style={{ color: '#8b93a8', fontSize: 12, lineHeight: 1.5 }}>{buildSignature.deploymentLabel} · built {buildSignature.builtAtLabel}</div>
          </div>
        </div>
      </aside>
      <style>{`
        .sidebar { box-sizing: border-box; position: sticky; top: 0; min-height: 100vh; transition: padding 180ms ease, width 180ms ease; overflow: hidden; }
        .sidebar__actions { display: flex; gap: 8px; flex: 0 0 auto; }
        .sidebar__collapse-toggle, .sidebar__close { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
        .sidebar__close { display: none; }
        .sidebar__nav-link { box-sizing: border-box; display: flex; align-items: center; gap: 11px; min-height: 44px; transition: background 180ms ease, transform 180ms ease, padding 180ms ease, color 180ms ease, box-shadow 180ms ease; }
        .sidebar__nav-link:hover { transform: translateX(2px); background: #f5f6ff !important; color: #4941c9 !important; }
        .sidebar__nav-icon { position: relative; width: 24px; height: 24px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; letter-spacing: 0.04em; background: #f0f2f8; color: #6b7285; flex: 0 0 auto; }
        .sidebar__nav-link:hover .sidebar__nav-icon { background: #e6e4ff; color: #4941c9; }
        .sidebar__nav-link[style*="linear-gradient"] .sidebar__nav-icon { background: rgba(255,255,255,0.18); color: #ffffff; }
        .sidebar__nav-icon-text { line-height: 1; }
        .sidebar--collapsed { width: 96px !important; min-width: 96px !important; max-width: 96px !important; padding: 14px 12px !important; gap: 18px !important; align-items: center; overflow: hidden; }
        .sidebar--collapsed .sidebar__brand-text, .sidebar--collapsed .sidebar__brand-detail, .sidebar--collapsed .sidebar__callout, .sidebar--collapsed .sidebar__footer, .sidebar--collapsed .sidebar__nav-label, .sidebar--collapsed .sidebar__nav-group-label { display: none !important; }
        .sidebar--collapsed .sidebar__brand-copy { display: flex; align-items: center; justify-content: center; width: 100%; min-width: 0; }
        .sidebar--collapsed .sidebar__brand-copy > div { justify-content: center; width: 100%; }
        .sidebar--collapsed nav { width: 100%; overflow: hidden; }
        .sidebar--collapsed .sidebar__nav-link { justify-content: center; width: 100%; min-width: 0; min-height: 44px; padding: 8px !important; border-radius: 16px; box-shadow: none !important; overflow: hidden; }
        .sidebar--collapsed .sidebar__nav-link:hover { transform: translateY(-1px); }
        .sidebar--collapsed .sidebar__nav-icon { width: 34px; height: 34px; font-size: 10px; background: #f0f2f8; }
        .sidebar--collapsed .sidebar__actions { flex-direction: column; width: 100%; align-items: center; }
        .sidebar--collapsed .sidebar__collapse-toggle { width: 38px; height: 38px; }
        .sidebar--collapsed .sidebar__nav-group { gap: 8px !important; width: 100%; }
        @media (max-width: 960px) {
          .sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: min(320px, calc(100vw - 24px)); max-width: 100%; min-height: 100vh; overflow-y: auto; z-index: 40; transform: translateX(-105%); transition: transform 180ms ease; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25); padding-left: clamp(18px, 3vw, 24px) !important; padding-right: clamp(18px, 3vw, 24px) !important; }
          .sidebar--collapsed { width: min(320px, calc(100vw - 24px)); padding: clamp(18px, 3vw, 24px) !important; gap: 22px !important; align-items: stretch; }
          .sidebar--collapsed .sidebar__brand-text, .sidebar--collapsed .sidebar__brand-detail, .sidebar--collapsed .sidebar__callout, .sidebar--collapsed .sidebar__footer, .sidebar--collapsed .sidebar__nav-label, .sidebar--collapsed .sidebar__nav-group-label { display: revert !important; }
          .sidebar--collapsed .sidebar__brand-copy { display: block; width: auto; }
          .sidebar--collapsed .sidebar__brand-mark { width: 42px; height: 42px; border-radius: 14px; display: inline-flex; background: linear-gradient(135deg, #7468ff 0%, #9b7cff 100%); font-size: 16px !important; letter-spacing: normal; text-transform: none; }
          .sidebar--collapsed .sidebar__nav-link { justify-content: flex-start; padding: 10px 11px !important; }
          .sidebar--collapsed .sidebar__nav-icon { width: 22px; height: 22px; font-size: 9px; background: rgba(255, 255, 255, 0.08); }
          .sidebar--collapsed .sidebar__actions { flex-direction: row; }
          .sidebar--open { transform: translateX(0); }
          .sidebar__collapse-toggle { display: none; }
          .sidebar__close { display: inline-flex; }
        }
      `}</style>
    </>
  );
}
