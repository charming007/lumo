import Link from 'next/link';
import { PageShell, Card } from '../../lib/ui';

export default function CanvasPage() {
  return (
    <PageShell
      title="Curriculum Canvas"
      subtitle="Canvas is being restored as its own workspace instead of dumping users into Content Library."
    >
      <Card title="Curriculum Canvas route restored" eyebrow="Route restored">
        <div style={{ color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
          This route used to redirect to <strong>Content Library</strong>. The redirect has been removed so the navigation behaves honestly.
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/content" style={{ textDecoration: 'none', fontWeight: 800, color: '#0f766e' }}>
            Open Content Library
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
