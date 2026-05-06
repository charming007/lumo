import Link from 'next/link';
import { Card, PageShell } from '../../lib/ui';

const guideCards = [
  {
    title: 'Dashboard guide',
    href: '/LMS_DASHBOARD_GUIDE.html',
    note: 'How the live dashboard, blocker cards, and operational signals fit together.',
    tone: { background: '#EEF2FF', color: '#3730A3' },
  },
  {
    title: 'MVP QA + UAT guide',
    href: '/LUMO_MVP_QA_UAT_GUIDE.html',
    note: 'Route-by-route verification checklist for the shipped LMS surface.',
    tone: { background: '#ECFDF5', color: '#166534' },
  },
  {
    title: 'Deploy verification checklist',
    href: '/DEPLOY_VERIFICATION_CHECKLIST.html',
    note: 'Use this when a deploy looks “fine” but you need proof the app is not lying.',
    tone: { background: '#FFF7ED', color: '#9A3412' },
  },
];

const repoDocs = [
  { label: 'Operator runbook', href: 'https://github.com/charmingdata/lumo/blob/main/docs/OPERATOR_RUNBOOK.md' },
  { label: 'Rewards system guide', href: 'https://github.com/charmingdata/lumo/blob/main/docs/REWARDS_SYSTEM_GUIDE.md' },
  { label: 'Architecture notes', href: 'https://github.com/charmingdata/lumo/blob/main/docs/ARCHITECTURE.md' },
  { label: 'Fallback failure catalog', href: 'https://github.com/charmingdata/lumo/blob/main/docs/LMS_FALLBACK_FAILURE_CATALOG.md' },
];

export default function GuidePage() {
  return (
    <PageShell
      title="Guide"
      subtitle="Shipped docs, checklists, and operator references for the live LMS. This route never needed a blocker — it just needed to stop hiding the docs it already had."
      aside={(
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/settings" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#EEF2FF', color: '#3730A3', textDecoration: 'none' }}>
            Open settings
          </Link>
          <Link href="/reports" style={{ borderRadius: 16, padding: '12px 14px', fontWeight: 700, background: '#0f172a', color: 'white', textDecoration: 'none' }}>
            Open reports
          </Link>
        </div>
      )}
    >
      <section style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
        <Card title="Live guide surfaces" eyebrow="Bundled with the LMS build">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {guideCards.map((card) => (
              <div key={card.title} style={{ padding: 18, borderRadius: 20, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{card.title}</div>
                  <div style={{ color: '#64748b', lineHeight: 1.6, marginTop: 6 }}>{card.note}</div>
                </div>
                <Link href={card.href} style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: card.tone.background, color: card.tone.color, textDecoration: 'none', width: 'fit-content' }}>
                  Open guide
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Operator quick links" eyebrow="When you need the right doc fast">
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              ['Content release blockers', '/content?view=blocked', 'Open the actual blocker workflow before you read docs about it.'],
              ['Curriculum canvas', '/canvas', 'Inspect module, lesson, and gate structure live.'],
              ['Rewards operations', '/rewards', 'Handle queue, leaderboard, and manual reward adjustments.'],
              ['Settings trust center', '/settings', 'Check storage posture, integrity, and runtime reports.'],
            ].map(([label, href, detail]) => (
              <Link key={href} href={href} style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#0f172a', display: 'grid', gap: 4 }}>
                <strong>{label}</strong>
                <span style={{ color: '#64748b', lineHeight: 1.6 }}>{detail}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Repository references" eyebrow="Deeper notes for the humans who like source material">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {repoDocs.map((doc) => (
              <a key={doc.href} href={doc.href} target="_blank" rel="noreferrer" style={{ borderRadius: 12, padding: '12px 14px', fontWeight: 700, background: '#F8FAFC', color: '#334155', textDecoration: 'none', border: '1px solid #E2E8F0' }}>
                {doc.label}
              </a>
            ))}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
