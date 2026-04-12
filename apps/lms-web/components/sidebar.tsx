'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationItems } from '../lib/navigation';

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
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
      <div>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#a78bfa' }}>Lumo</div>
        <div style={{ color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 }}>Learning operations cockpit for mallams, pods, and pilot delivery.</div>
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
  );
}
