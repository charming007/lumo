import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Card, MetricList, PageShell, SimpleTable, responsiveGrid } from '../lib/ui';

type VerificationItem = {
  surface: string;
  expected: string;
  failure: string;
};

type FixItem = {
  label: string;
  value: string;
};

type Props = {
  title: string;
  subtitle: string;
  blockerHeadline: string;
  blockerDetail: ReactNode;
  whyBlocked: string[];
  verificationItems: VerificationItem[];
  fixItems?: FixItem[];
  docs?: Array<{ label: string; href: string; background: string; color: string; border?: string }>;
};

const actionStyle: CSSProperties = {
  borderRadius: 14,
  padding: '12px 14px',
  fontWeight: 800,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export function DeploymentBlockerCard({
  title,
  subtitle,
  blockerHeadline,
  blockerDetail,
  whyBlocked,
  verificationItems,
  fixItems = [
    { label: 'Env var', value: 'NEXT_PUBLIC_API_BASE_URL' },
    { label: 'Expected format', value: 'https://your-lumo-api.up.railway.app' },
    { label: 'Deployment action', value: 'Set env in Vercel and redeploy' },
  ],
  docs = [],
}: Props) {
  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      aside={docs.length ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {docs.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              target={doc.href.startsWith('http') ? '_blank' : undefined}
              rel={doc.href.startsWith('http') ? 'noreferrer' : undefined}
              style={{ ...actionStyle, background: doc.background, color: doc.color, border: doc.border }}
            >
              {doc.label}
            </Link>
          ))}
        </div>
      ) : undefined}
    >
      <section style={{ display: 'grid', gap: 20 }}>
        <div style={{ padding: '22px 24px', borderRadius: 24, background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)', border: '1px solid #ea580c', color: '#ffedd5', boxShadow: '0 24px 60px rgba(124, 45, 18, 0.24)' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <strong style={{ fontSize: 24, color: 'white' }}>{blockerHeadline}</strong>
            <div style={{ lineHeight: 1.7 }}>
              {blockerDetail}
            </div>
          </div>
        </div>

        <section style={{ ...responsiveGrid(280) }}>
          <Card title="What to fix" eyebrow="Required action">
            <MetricList items={fixItems} />
          </Card>

          <Card title="Why this page is blocked" eyebrow="No fake green lights">
            <div style={{ display: 'grid', gap: 12, color: '#475569', lineHeight: 1.7 }}>
              {whyBlocked.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </Card>
        </section>

        <Card title="Verification after redeploy" eyebrow="Do these checks">
          <SimpleTable
            columns={['Surface', 'Expected result', 'Failure smell']}
            rows={verificationItems.map((item) => [item.surface, item.expected, item.failure])}
          />
        </Card>
      </section>
    </PageShell>
  );
}
