import { AppShell } from '../components/shell';
import { DemoBanner } from '../components/demo-banner';
import { ProductionConfigBanner } from '../components/production-config-banner';
import { fetchMeta } from '../lib/api';
import { API_BASE_SOURCE } from '../lib/config';
import type { MetaResponse } from '../lib/types';

export const metadata = {
  title: 'Lumo LMS',
  description: 'Lumo teacher and admin portal',
};

const FALLBACK_META: MetaResponse = {
  actor: {
    role: 'admin',
    name: 'Fallback Admin',
  },
  mode: 'degraded',
  seedSummary: {},
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const meta = await fetchMeta().catch(() => FALLBACK_META);

  const seedCount = Object.values(meta.seedSummary ?? {}).reduce((sum, count) => sum + count, 0);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#f5f7fb' }}>
        <AppShell>
          <DemoBanner role={meta.actor.role} mode={meta.mode} seedCount={seedCount} apiSource={API_BASE_SOURCE} />
          <ProductionConfigBanner />
          {children}
        </AppShell>
      </body>
    </html>
  );
}
