import Link from 'next/link';
import { fetchConfigAudit, fetchMeta, fetchStorageStatus } from '../../lib/api';
import { Card, MetricList, PageShell, Pill, SimpleTable, responsiveGrid } from '../../lib/ui';

export default async function GuidePage() {
  const [meta, configAudit, storageStatus] = await Promise.all([
    fetchMeta(),
    fetchConfigAudit(),
    fetchStorageStatus(),
  ]);

  const warnings = configAudit.warnings || [];
  const errors = configAudit.errors || [];

  return (
    <PageShell
      title="Guide"
      subtitle="Operational guide rails for deployment trust, storage posture, and environment readiness."
      breadcrumbs={[{ label: 'Dashboard', href: '/' }]}
      aside={
        <Card title="Guide summary" eyebrow="Runtime">
          <MetricList
            items={[
              { label: 'Mode', value: meta.mode || 'unknown' },
              { label: 'Storage', value: storageStatus.db?.mode || storageStatus.mode || 'unknown' },
              { label: 'Warnings', value: String(configAudit.summary.warningCount || 0) },
              { label: 'Errors', value: String(configAudit.summary.errorCount || 0) },
            ]}
          />
        </Card>
      }
    >
      <section style={{ ...responsiveGrid(280), marginBottom: 20 }}>
        <Card title="Deployment trust" eyebrow="Config audit">
          <div style={{ display: 'grid', gap: 10 }}>
            <Pill
              label={configAudit.summary.ready ? 'Ready' : 'Needs attention'}
              tone={configAudit.summary.ready ? '#ECFDF5' : '#FEF2F2'}
              text={configAudit.summary.ready ? '#166534' : '#991B1B'}
            />
            <div style={{ color: '#475569', lineHeight: 1.7 }}>
              Use this route as the operator guide for environment health instead of hiding it behind Settings redirects.
            </div>
          </div>
        </Card>

        <Card title="Quick links" eyebrow="Operator shortcuts">
          <div style={{ display: 'grid', gap: 12 }}>
            <Link href="/settings" style={{ color: '#3730A3', fontWeight: 800, textDecoration: 'none' }}>Open settings trust center</Link>
            <Link href="/reports" style={{ color: '#0f766e', fontWeight: 800, textDecoration: 'none' }}>Open reports</Link>
            <Link href="/content" style={{ color: '#9a3412', fontWeight: 800, textDecoration: 'none' }}>Open content library</Link>
          </div>
        </Card>
      </section>

      <Card title="Audit findings" eyebrow="Warnings and errors">
        <SimpleTable
          columns={['Type', 'Detail']}
          rows={[
            ...errors.map((error) => ['Error', error]),
            ...warnings.map((warning) => ['Warning', warning]),
          ]}
        />
      </Card>
    </PageShell>
  );
}
