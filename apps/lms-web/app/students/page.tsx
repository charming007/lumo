import Link from 'next/link';
import { PageShell, Card } from '../../lib/ui';

export default function StudentsPage() {
  return (
    <PageShell
      title="Students"
      subtitle="Student operations are being rebuilt as a dedicated surface instead of redirecting into Progress."
    >
      <Card title="Students workspace in progress" eyebrow="Route restored">
        <div style={{ color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
          This route used to redirect to <strong>Progress</strong>, which is why the nav felt broken. The redirect has been removed.
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/progress" style={{ textDecoration: 'none', fontWeight: 800, color: '#3730a3' }}>
            Open Progress
          </Link>
          <Link href="/content" style={{ textDecoration: 'none', fontWeight: 800, color: '#0f766e' }}>
            Open Content Library
          </Link>
        </div>
      </Card>
    </PageShell>
  );
}
