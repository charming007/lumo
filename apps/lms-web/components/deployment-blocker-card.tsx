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
  evidenceTitle?: string;
  evidenceLines?: string[];
  commandTitle?: string;
  commandBlock?: string;
};

const actionStyle: CSSProperties = {
  borderRadius: 16,
  padding: '12px 15px',
  fontWeight: 850,
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
  evidenceTitle,
  evidenceLines = [],
  commandTitle,
  commandBlock,
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
      <section style={{ display: 'grid', gap: 22 }}>
        <div style={{ padding: 'clamp(22px, 4vw, 34px)', borderRadius: 30, background: 'linear-gradient(135deg, #fff1e7 0%, #fff8f2 52%, #f6f2ff 100%)', border: '1px solid #f5d5c0', color: '#8f3f16', boxShadow: '0 24px 70px rgba(154, 52, 18, 0.10)', overflowWrap: 'anywhere' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ width: 54, height: 54, borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', color: '#8f3f16', fontWeight: 950, boxShadow: '0 16px 32px rgba(154, 52, 18, 0.12)' }}>!</div>
            <strong style={{ fontSize: 'clamp(24px, 3vw, 34px)', color: '#7c2d12', lineHeight: 1.18 }}>{blockerHeadline}</strong>
            <div style={{ lineHeight: 1.75, color: '#9a5a1f', fontSize: 16 }}>
              {blockerDetail}
            </div>
          </div>
        </div>

        <section style={{ ...responsiveGrid(320) }}>
          <Card title="What to fix" eyebrow="Required action">
            <MetricList items={fixItems} />
          </Card>

          <Card title="Why this page is blocked" eyebrow="No fake green lights">
            <div style={{ display: 'grid', gap: 14, color: '#667085', lineHeight: 1.75, fontSize: 15 }}>
              {whyBlocked.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </Card>
        </section>

        {(evidenceLines.length || commandBlock) ? (
          <section style={{ ...responsiveGrid(320) }}>
            {evidenceLines.length ? (
              <Card title={evidenceTitle ?? 'Evidence'} eyebrow="What the blocker can already prove">
                <div style={{ display: 'grid', gap: 12, color: '#667085', lineHeight: 1.7 }}>
                  {evidenceLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </Card>
            ) : null}

            {commandBlock ? (
              <Card title={commandTitle ?? 'Copy-paste checks'} eyebrow="Verify the suspected failure fast">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto', font: '500 .94rem/1.7 ui-monospace,SFMono-Regular,Menlo,monospace', color: '#202436', background: '#f7f8fc', border: '1px solid #edf0f6', borderRadius: 18, padding: 14 }}>{commandBlock}</pre>
              </Card>
            ) : null}
          </section>
        ) : null}

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
