'use client';

export const dynamic = 'force-dynamic';

const secondaryActionStyle = {
  borderRadius: 999,
  border: '1px solid #cbd5e1',
  color: '#0f172a',
  fontWeight: 700,
  padding: '12px 18px',
  textDecoration: 'none',
} as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          fontFamily: 'Inter, Arial, sans-serif',
          background: '#f8fafc',
          color: '#0f172a',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
        }}
      >
        <main
          style={{
            width: '100%',
            maxWidth: 640,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 24,
            padding: 32,
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
          }}
        >
          <p style={{ margin: 0, color: '#475569', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Lumo LMS
          </p>
          <h1 style={{ margin: '12px 0 8px', fontSize: 32, lineHeight: 1.1 }}>
            Dashboard crashed before it could render.
          </h1>
          <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
            This route hit an unrecoverable client/runtime error. Retry once. If it keeps happening, the deployment is not healthy enough to trust.
          </p>
          <div
            style={{
              marginTop: 18,
              padding: '16px 18px',
              borderRadius: 18,
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              color: '#9a3412',
              display: 'grid',
              gap: 10,
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: '#7c2d12' }}>Treat this as a deployment blocker until proven otherwise.</strong>
            <span>
              If retry fails, open settings to verify the configured API target, then use the deploy checklist before calling this LMS build healthy.
            </span>
          </div>
          {error.digest ? (
            <p style={{ margin: '16px 0 0', color: '#94a3b8', fontSize: 14 }}>
              Error digest: {error.digest}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: 0,
                borderRadius: 999,
                background: '#2563eb',
                color: 'white',
                fontWeight: 800,
                padding: '12px 18px',
                cursor: 'pointer',
              }}
            >
              Retry dashboard
            </button>
            <a href="/settings" style={secondaryActionStyle}>
              Open settings
            </a>
            <a href="/DEPLOY_VERIFICATION_CHECKLIST.html" style={secondaryActionStyle}>
              Open deploy checklist
            </a>
            <a href="/content?view=blocked" style={secondaryActionStyle}>
              Review content blockers
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
