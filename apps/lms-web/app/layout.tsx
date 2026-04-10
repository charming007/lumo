import { AppShell } from '../components/shell';
import { DemoBanner } from '../components/demo-banner';
import { fetchMeta } from '../lib/api';

export const metadata = {
  title: 'Lumo LMS',
  description: 'Lumo teacher and admin portal',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const meta = await fetchMeta();

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#f5f7fb' }}>
        <AppShell>
          <DemoBanner role={meta.actor.role} mode={meta.mode} />
          {children}
        </AppShell>
      </body>
    </html>
  );
}
