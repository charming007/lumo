import Link from 'next/link';
import { PageShell, Pill } from '../lib/ui';

const primaryLinkStyle = {
  borderRadius: 14,
  padding: '12px 14px',
  fontWeight: 800,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

export function PilotScopeBlocker({
  title,
  rationale,
  keepUsing,
}: {
  title: string;
  rationale: string;
  keepUsing: string[];
}) {
  return (
    <PageShell
      title={title}
      subtitle="This route exists in the repo, but it is intentionally outside the pilot LMS deployment target."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/" style={{ ...primaryLinkStyle, background: '#111827', color: 'white' }}>Open dashboard</Link>
          <Link href="/content" style={{ ...primaryLinkStyle, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>Open content</Link>
          <Link href="/assignments" style={{ ...primaryLinkStyle, background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' }}>Open assignments</Link>
        </div>
      )}
    >
      <section style={{ maxWidth: 900 }}>
        <div style={{ padding: '24px', borderRadius: 24, background: 'linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%)', border: '1px solid #fed7aa', display: 'grid', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#9A3412', fontWeight: 800 }}>Pilot scope blocker</div>
              <strong style={{ fontSize: 28, color: '#7C2D12' }}>{title} is deferred for pilot</strong>
              <div style={{ color: '#9A3412', lineHeight: 1.7 }}>{rationale}</div>
            </div>
            <Pill label="Deferred route" tone="#FEE2E2" text="#991B1B" />
          </div>

          <div style={{ padding: '16px 18px', borderRadius: 18, background: 'white', border: '1px solid #fed7aa', display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, color: '#9A3412', fontWeight: 800 }}>Use the launch-critical surfaces instead</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {keepUsing.map((label) => (
                <Pill key={label} label={label} tone="#FFF7ED" text="#9A3412" />
              ))}
            </div>
            <div style={{ color: '#7C2D12', lineHeight: 1.7 }}>
              If this route is suddenly required for go-live, that means pilot scope is drifting. Fix the operating plan first instead of quietly expanding the deployment target.
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
