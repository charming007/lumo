import { AppShell } from '../components/shell';
import { DemoBanner } from '../components/demo-banner';
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

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#f5f7fb' }}>
        <AppShell>
          <DemoBanner role={meta.actor.role} mode={meta.mode} apiSource={API_BASE_SOURCE} />
          {children}
        </AppShell>
      </body>
    </html>
  );
}
