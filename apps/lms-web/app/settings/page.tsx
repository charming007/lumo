import { Card, PageShell } from '../../lib/ui';

export default function SettingsPage() {
  return (
    <PageShell title="Settings" subtitle="Platform controls, audio defaults, and deployment configuration.">
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Voice system">
          <ul>
            <li>Default mode: Hybrid</li>
            <li>Persistent speaker button: Enabled</li>
            <li>Instruction playback: Enabled</li>
          </ul>
        </Card>
        <Card title="Progression">
          <ul>
            <li>Lock/unlock lessons: Enabled</li>
            <li>Automatic tests: Enabled</li>
            <li>Manual Mallam exams: Enabled</li>
          </ul>
        </Card>
      </section>
    </PageShell>
  );
}
