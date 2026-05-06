'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { BuildSignature } from '../lib/build-signature';
import { navigationItems } from '../lib/navigation';

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemMonogram(label: string) {
  return label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

type SidebarProps = {
  mobileNavOpen?: boolean;
  sidebarCollapsed?: boolean;
  buildSignature: BuildSignature;
  onCloseMobileNav?: () => void;
  onToggleSidebarCollapse?: () => void;
};

export function Sidebar({
  mobileNavOpen = false,
  sidebarCollapsed = false,
  buildSignature,
  onCloseMobileNav,
  onToggleSidebarCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const safePathname = pathname || '';
  const previousPathnameRef = useRef(safePathname);

  useEffect(() => {
    if (previousPathnameRef.current !== safePathname && mobileNavOpen) {
      onCloseMobileNav?.();
    }

    previousPathnameRef.current = safePathname;
  }, [safePathname, mobileNavOpen, onCloseMobileNav]);

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
          background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
          color: 'white',
          padding: 'clamp(18px, 3vw, 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div className="sidebar__brand-copy">
            <div className="sidebar__brand-mark" aria-hidden="true" style={{ fontSize: 30, fontWeight: 900, color: '#a78bfa' }}>Lumo</div>
            <div className="sidebar__brand-detail" style={{ color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>
              Pilot control plane for curriculum release, delivery, learner progression, and deployment trust.
            </div>
          </div>
          <div className="sidebar__actions">
            <button
              type="button"
              className="sidebar__collapse-toggle"
              onClick={onToggleSidebarCollapse}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!sidebarCollapsed}
              aria-controls="lumo-sidebar"
              style={{
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                width: 40,
                height: 40,
                borderRadius: 999,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
            <button
              type="button"
              className="sidebar__close"
              onClick={onCloseMobileNav}
              aria-label="Close navigation menu"
              style={{
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                width: 40,
                height: 40,
                borderRadius: 999,
                cursor: 'pointer',
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div className="sidebar__callout" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 16 }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Admin shell</div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>Pilot-only navigation is live</div>
          <div className="sidebar__callout-detail" style={{ marginTop: 6, color: '#cbd5e1' }}>Use this shell for the routes operators are actually meant to trust during pilot review: dashboard, content, assignments, progress, and settings.</div>
        </div>

        <nav style={{ display: 'grid', gap: 10 }}>
          {navigationItems.map((item) => {
            const active = isActivePath(safePathname, item.href);
            const monogram = itemMonogram(item.label);
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                data-nav-id={item.id}
                data-nav-href={item.href}
                aria-label={sidebarCollapsed ? item.label : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                className={`sidebar__nav-link ${sidebarCollapsed ? 'sidebar__nav-link--collapsed' : ''}`}
                style={{
                  textDecoration: 'none',
                  color: '#e5e7eb',
                  padding: '13px 14px',
                  borderRadius: 16,
                  background: active
                    ? 'linear-gradient(135deg, #6C63FF 0%, #8B7FFF 100%)'
                    : 'rgba(255,255,255,0.04)',
                  fontWeight: 700,
                  border: active
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: active ? '0 14px 28px rgba(108, 99, 255, 0.28)' : 'none',
                }}
              >
                <span className="sidebar__nav-icon" aria-hidden="true">
                  <span className="sidebar__nav-icon-text">{monogram}</span>
                </span>
                <span className="sidebar__nav-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar__footer" style={{ marginTop: 'auto', background: '#111827', borderRadius: 20, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Pilot workspace</div>
          <div className="sidebar__footer-detail" style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>Use this shell to publish curriculum, assign delivery, monitor learner risk, and verify deployment trust without wandering into non-pilot side quests.</div>
          <div className="sidebar__footer-build" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: 4 }}>
            <div style={{ color: '#c4b5fd', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Live build signal</div>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>v{buildSignature.version} · {buildSignature.commitShort}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{buildSignature.deploymentLabel} · built {buildSignature.builtAtLabel}</div>
          </div>
        </div>
      </aside>
      <style>{`
        .sidebar {
          position: sticky;
          top: 0;
          min-height: 100vh;
          transition: padding 180ms ease, width 180ms ease;
          overflow: hidden;
        }

        .sidebar__actions {
          display: flex;
          gap: 8px;
          flex: 0 0 auto;
        }

        .sidebar__collapse-toggle,
        .sidebar__close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .sidebar__close {
          display: none;
        }

        .sidebar__nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 52px;
          transition: background 180ms ease, transform 180ms ease, padding 180ms ease;
        }

        .sidebar__nav-link:hover {
          transform: translateX(2px);
        }

        .sidebar__nav-icon {
          position: relative;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          background: rgba(255, 255, 255, 0.12);
          color: #f8fafc;
          flex: 0 0 auto;
        }

        .sidebar__nav-icon-text {
          line-height: 1;
        }

        .sidebar--collapsed {
          width: 92px;
          padding: 14px 12px !important;
          gap: 18px !important;
          align-items: center;
        }

        .sidebar--collapsed .sidebar__brand-detail,
        .sidebar--collapsed .sidebar__callout,
        .sidebar--collapsed .sidebar__footer,
        .sidebar--collapsed .sidebar__nav-label {
          display: none;
        }

        .sidebar--collapsed .sidebar__brand-copy {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .sidebar--collapsed .sidebar__brand-mark {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(167, 139, 250, 0.14);
          border: 1px solid rgba(167, 139, 250, 0.2);
          font-size: 14px !important;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .sidebar--collapsed .sidebar__nav-link {
          justify-content: center;
          width: 100%;
          min-width: 0;
          min-height: 56px;
          padding: 10px !important;
          border-radius: 18px;
        }

        .sidebar--collapsed .sidebar__nav-link:hover {
          transform: translateY(-1px);
        }

        .sidebar--collapsed .sidebar__nav-icon {
          width: 34px;
          height: 34px;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.14);
        }

        .sidebar--collapsed .sidebar__actions {
          flex-direction: column;
        }

        @media (max-width: 960px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: min(320px, calc(100vw - 24px));
            max-width: 100%;
            min-height: 100vh;
            overflow-y: auto;
            z-index: 40;
            transform: translateX(-105%);
            transition: transform 180ms ease;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
            padding-left: clamp(18px, 3vw, 24px) !important;
            padding-right: clamp(18px, 3vw, 24px) !important;
          }

          .sidebar--collapsed {
            width: min(320px, calc(100vw - 24px));
            padding: clamp(18px, 3vw, 24px) !important;
            gap: 22px !important;
            align-items: stretch;
          }

          .sidebar--collapsed .sidebar__brand-detail,
          .sidebar--collapsed .sidebar__callout,
          .sidebar--collapsed .sidebar__footer,
          .sidebar--collapsed .sidebar__nav-label {
            display: revert;
          }

          .sidebar--collapsed .sidebar__brand-copy {
            display: block;
            width: auto;
          }

          .sidebar--collapsed .sidebar__brand-mark {
            width: auto;
            height: auto;
            border-radius: 0;
            display: block;
            background: none;
            border: 0;
            font-size: 30px !important;
            letter-spacing: normal;
            text-transform: none;
          }

          .sidebar--collapsed .sidebar__nav-link {
            justify-content: flex-start;
            padding: 13px 14px !important;
          }

          .sidebar--collapsed .sidebar__nav-icon {
            width: 24px;
            height: 24px;
            font-size: 11px;
            background: rgba(255, 255, 255, 0.12);
          }

          .sidebar--collapsed .sidebar__actions {
            flex-direction: row;
          }

          .sidebar--open {
            transform: translateX(0);
          }

          .sidebar__collapse-toggle {
            display: none;
          }

          .sidebar__close {
            display: inline-flex;
          }
        }
      `}</style>
    </>
  );
}
