import Link from 'next/link';
import type { CSSProperties } from 'react';
import { API_BASE_SOURCE } from '../lib/config';

const shellStyle: CSSProperties = {
  margin: '16px clamp(16px, 4vw, 32px) 0',
  padding: '18px clamp(16px, 2.8vw, 24px)',
  borderRadius: 20,
  background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
  border: '1px solid #ea580c',
  color: '#ffedd5',
  display: 'grid',
  gap: 12,
  boxShadow: '0 18px 42px rgba(124, 45, 18, 0.28)',
};

const actionStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  padding: '11px 14px',
  fontWeight: 800,
  textDecoration: 'none',
};

export function ProductionConfigBanner() {
  if (API_BASE_SOURCE !== 'missing-production-env') {
    return null;
  }

  return (
    <section style={shellStyle} aria-label="Production configuration warning">
      <div style={{ display: 'grid', gap: 6 }}>
        <strong style={{ color: 'white', fontSize: 18 }}>
          Deployment blocker: NEXT_PUBLIC_API_BASE_URL is missing in production.
        </strong>
        <span style={{ lineHeight: 1.7 }}>
          This LMS is intentionally refusing to fake a backend URL. Until the env var is set, live API-backed screens across dashboard, content, reports, and the rest of the app can only render degraded fallback states.
        </span>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ color: '#fed7aa', lineHeight: 1.7 }}>
          <strong style={{ color: 'white' }}>Set this env var:</strong>{' '}
          <code style={{ color: 'white', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code>
        </div>
        <div style={{ color: '#fed7aa', lineHeight: 1.7 }}>
          <strong style={{ color: 'white' }}>Expected format:</strong>{' '}
          <code style={{ color: 'white', fontWeight: 900 }}>https://your-lumo-api.up.railway.app</code>
        </div>
        <div style={{ color: '#fed7aa', lineHeight: 1.7 }}>
          Add it in your production deployment settings, redeploy, then verify the three pages that expose the most obvious live data paths.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/" style={{ ...actionStyle, background: '#fff7ed', color: '#9a3412' }}>
          Verify dashboard
        </Link>
        <Link href="/content" style={{ ...actionStyle, background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' }}>
          Verify content
        </Link>
        <Link href="/reports" style={{ ...actionStyle, background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.24)' }}>
          Verify reports
        </Link>
      </div>
    </section>
  );
}
