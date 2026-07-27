import Link from 'next/link';
import type { CSSProperties } from 'react';
import { API_BASE_DIAGNOSTIC } from '../lib/config';

const shellStyle: CSSProperties = {
  margin: '18px clamp(18px, 3vw, 32px) 0',
  padding: '18px clamp(16px, 2.8vw, 24px)',
  borderRadius: 26,
  background: 'linear-gradient(135deg, #fff7ed 0%, #fffaf5 100%)',
  border: '1px solid #fed7aa',
  color: '#9a3412',
  display: 'grid',
  gap: 12,
  boxShadow: '0 20px 55px rgba(154, 52, 18, 0.10)',
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
  if (!API_BASE_DIAGNOSTIC.deploymentBlocked) {
    return null;
  }

  return (
    <section style={shellStyle} aria-label="Production configuration warning">
      <div style={{ display: 'grid', gap: 6 }}>
        <strong style={{ color: '#7c2d12', fontSize: 18 }}>
          {API_BASE_DIAGNOSTIC.configuredApiBase
            ? 'Deployment blocker: NEXT_PUBLIC_API_BASE_URL is configured, but it is not safe to ship.'
            : 'Deployment blocker: NEXT_PUBLIC_API_BASE_URL is missing in production.'}
        </strong>
        <span style={{ lineHeight: 1.7 }}>{API_BASE_DIAGNOSTIC.blockerDetail}</span>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ color: '#9a5a1f', lineHeight: 1.7 }}>
          <strong style={{ color: '#7c2d12' }}>Set this env var:</strong>{' '}
          <code style={{ color: '#7c2d12', fontWeight: 900 }}>NEXT_PUBLIC_API_BASE_URL</code>
        </div>
        <div style={{ color: '#9a5a1f', lineHeight: 1.7 }}>
          <strong style={{ color: '#7c2d12' }}>Expected format:</strong>{' '}
          <code style={{ color: '#7c2d12', fontWeight: 900 }}>{API_BASE_DIAGNOSTIC.expectedFormat}</code>
        </div>
        {API_BASE_DIAGNOSTIC.configuredApiBase ? (
          <div style={{ color: '#9a5a1f', lineHeight: 1.7 }}>
            <strong style={{ color: '#7c2d12' }}>Current value:</strong>{' '}
            <code style={{ color: '#7c2d12', fontWeight: 900 }}>{API_BASE_DIAGNOSTIC.configuredApiBase}</code>
          </div>
        ) : null}
        <div style={{ color: '#9a5a1f', lineHeight: 1.7 }}>
          Fix the production env, redeploy, then verify the live admin routes that actually matter for deployment readiness.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/" style={{ ...actionStyle, background: '#9a3412', color: '#ffffff' }}>
          Verify dashboard
        </Link>
        <Link href="/content" style={{ ...actionStyle, background: '#ffffff', color: '#9a3412', border: '1px solid #fdba74' }}>
          Verify content
        </Link>
        <Link href="/settings" style={{ ...actionStyle, background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' }}>
          Verify settings
        </Link>
      </div>
    </section>
  );
}
