'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import type { BuildSignature } from '../lib/build-signature';
import { navigationItems, pilotNavigationIds } from '../lib/navigation';

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
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current !== pathname && mobileNavOpen) {
      onCloseMobileNav?.();
    }

    previousPathnameRef.current = pathname;
  }, [pathname, mobileNavOpen, onCloseMobileNav]);

  const activeItem = useMemo(
    () => navigationItems.find((item) => isActivePath(pathname, item.href)),
    [pathname],
  );

  const primaryItems = useMemo(
    () => navigationItems.filter((item) => pilotNavigationIds.has(item.id)),
    [],
  );

  const tuckedAwayItems = useMemo(
    () => navigationItems.filter((item) => !pilotNavigationIds.has(item.id)),
    [],
  );

  const activeInternalItem =
    activeItem && !pilotNavigationIds.has(activeItem.id) ? activeItem : null;

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
            <div style={{ fontSize: 30, fontWeight: 900, color: '#a78bfa' }}>Lumo</div>
            <div className="sidebar__brand-detail" style={{ color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>
              Pilot control plane for release readiness, delivery pressure, learner risk, and deployment trust.
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
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Pilot workspace</div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>Focused pilot navigation</div>
          <div className="sidebar__callout-detail" style={{ marginTop: 6, color: '#cbd5e1' }}>
            Keep operators on the five routes that matter for launch: dashboard, content, assignments, progress, and settings.
          </div>
        </div>

        <nav style={{ display: 'grid', gap: 10 }}>
          {primaryItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const monogram = itemMonogram(item.label);

            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                data-nav-id={item.id}
                data-nav-href={item.href}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseMobileNav?.();
                }}
                aria-label={sidebarCollapsed ? item.label : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                className={`sidebar__nav-link ${sidebarCollapsed ? 'sidebar__nav-link--collapsed' : ''}`}
                style={{
                  textDecoration: 'none',
                  color: '#e5e7eb',
                  padding: '13px 14px',
                  borderRadius: 16,
                  background: active ? 'linear-gradient(135deg, #6C63FF 0%, #8B7FFF 100%)' : 'rgba(255,255,255,0.04)',
                  fontWeight: 700,
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: active ? '0 14px 28px rgba(108, 99, 255, 0.28)' : 'none',
                }}
              >
                <span className="sidebar__nav-icon" aria-hidden="true">{monogram}</span>
                <span className="sidebar__nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {activeInternalItem ? (
          <div
            className="sidebar__internal-route"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18,
              padding: 14,
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1 }}>
              Internal route currently open
            </div>
            <Link
              href={activeInternalItem.href}
              prefetch={false}
              onClick={(event) => {
                event.stopPropagation();
                onCloseMobileNav?.();
              }}
              style={{
                textDecoration: 'none',
                color: 'white',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(108, 99, 255, 0.18)',
                border: '1px solid rgba(139, 127, 255, 0.35)',
              }}
            >
              <span className="sidebar__nav-icon" aria-hidden="true">{itemMonogram(activeInternalItem.label)}</span>
              <span className="sidebar__nav-label">{activeInternalItem.label}</span>
            </Link>
            <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>
              This route still works, but it stays out of the default pilot shell so operators do not wander into non-critical surfaces during deployment review.
            </div>
          </div>
        ) : null}

        <div className="sidebar__footer" style={{ marginTop: 'auto', background: '#111827', borderRadius: 20, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Pilot shell</div>
          <div className="sidebar__footer-detail" style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>
            Hidden from default nav: {tuckedAwayItems.map((item) => item.label).join(', ')}.
          </div>
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

        .sidebar--collapsed {
          padding-left: 14px !important;
          padding-right: 14px !important;
        }

        .sidebar--collapsed .sidebar__brand-detail,
        .sidebar--collapsed .sidebar__callout,
        .sidebar--collapsed .sidebar__internal-route,
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

        .sidebar--collapsed .sidebar__nav-link {
          justify-content: center;
          padding-left: 12px !important;
          padding-right: 12px !important;
          min-width: 0;
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

          .sidebar--collapsed .sidebar__brand-detail,
          .sidebar--collapsed .sidebar__callout,
          .sidebar--collapsed .sidebar__internal-route,
          .sidebar--collapsed .sidebar__footer,
          .sidebar--collapsed .sidebar__nav-label {
            display: initial;
          }

          .sidebar--collapsed .sidebar__callout,
          .sidebar--collapsed .sidebar__internal-route,
          .sidebar--collapsed .sidebar__footer {
            display: block;
          }

          .sidebar--collapsed .sidebar__brand-copy {
            display: block;
            width: auto;
          }

          .sidebar--collapsed .sidebar__nav-link {
            justify-content: flex-start;
            padding-left: 14px !important;
            padding-right: 14px !important;
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
