import Link from 'next/link';
import { PageShell, Card } from '../../lib/ui';

export default function RewardsPage() {
  return (
    <PageShell
      title="Rewards"
      subtitle="Rewards is being restored as its own route instead of redirecting to Settings."
    >
      <Card title="Rewards workspace in progress" eyebrow="Route restored">
        <div style={{ color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
          This route used to redirect to <strong>Settings</strong>. The redirect has been removed.
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/settings" style={{ textDecoration: 'none', fontWeight: 800, color: '#6d28d9' }}>
            Open Settings
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
