import Link from 'next/link';
import { PageShell, Card } from '../../lib/ui';

export default function MallamsPage() {
  return (
    <PageShell
      title="Mallams"
      subtitle="Mallam operations are being rebuilt as a dedicated route instead of redirecting to Assignments."
    >
      <Card title="Mallams workspace in progress" eyebrow="Route restored">
        <div style={{ color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
          This route used to redirect to <strong>Assignments</strong>. The redirect has been removed.
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/assignments" style={{ textDecoration: 'none', fontWeight: 800, color: '#9a3412' }}>
            Open Assignments
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
