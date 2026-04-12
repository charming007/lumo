'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { navigationItems } from '../lib/navigation';

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ mobileNavOpen = false, onCloseMobileNav }: { mobileNavOpen?: boolean; onCloseMobileNav?: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (mobileNavOpen) {
      onCloseMobileNav?.();
    }
  }, [pathname, mobileNavOpen, onCloseMobileNav]);

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
        id="lumo-sidebar"
        className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}
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
          <div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#a78bfa' }}>Lumo</div>
            <div style={{ color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>Learning operations cockpit for mallams, pods, and pilot delivery.</div>
          </div>
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

        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 16 }}>
          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Live pilot</div>
          <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>Kano + Kaduna</div>
          <div style={{ marginTop: 6, color: '#cbd5e1' }}>Offline-first classroom deployment with shared tablet pods.</div>
        </div>

        <nav style={{ display: 'grid', gap: 10 }}>
          {navigationItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobileNav?.()}
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
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', background: '#111827', borderRadius: 20, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Admin workspace</div>
          <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>Use this view to supervise readiness, content release, mallam support, and pod reliability.</div>
        </div>
      </aside>
      <style jsx>{`
        .sidebar {
          position: sticky;
          top: 0;
          min-height: 100vh;
        }

        .sidebar__close {
          display: none;
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
          }

          .sidebar--open {
            transform: translateX(0);
          }

          .sidebar__close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
          }
        }
      `}</style>
    </>
  );
}
