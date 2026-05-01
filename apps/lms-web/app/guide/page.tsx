import fs from 'node:fs/promises';
import path from 'node:path';
import { redirectIfPilotHiddenRoute } from '../../lib/pilot-nav';

const GUIDE_FILES = [
  {
    title: 'LMS Dashboard Guide',
    description: 'Main operator handbook for the LMS dashboard, content flow, reporting surfaces, and admin workflow.',
    htmlFile: 'LMS_DASHBOARD_GUIDE.html',
  },
  {
    title: 'Rewards System Guide',
    description: 'Current-state guide for backend vs learner-tablet rewards, canonical truth, sync behavior, and interim operating rules.',
    htmlFile: 'REWARDS_SYSTEM_GUIDE.html',
  },
  {
    title: 'MVP QA / UAT Guide',
    description: 'Structured test guide for validating the Lumo MVP across the LMS and learner tablet app.',
    htmlFile: 'LUMO_MVP_QA_UAT_GUIDE.html',
  },
] as const;

async function loadGuideHtml(fileName: string) {
  const docsPath = path.join(process.cwd(), '..', '..', 'docs', fileName);
  return fs.readFile(docsPath, 'utf8');
}

export default async function GuidePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirectIfPilotHiddenRoute('/guide');

  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedGuide = typeof resolvedSearchParams.doc === 'string' ? resolvedSearchParams.doc : GUIDE_FILES[0].htmlFile;
  const activeGuide = GUIDE_FILES.find((guide) => guide.htmlFile === requestedGuide) ?? GUIDE_FILES[0];
  const activeHtml = await loadGuideHtml(activeGuide.htmlFile);

  return (
    <main style={{ padding: '32px clamp(18px, 4vw, 40px) 56px' }}>
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a, #312e81 60%, #4f46e5)',
          color: 'white',
          borderRadius: 28,
          padding: '28px clamp(20px, 4vw, 34px)',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <span style={badgeStyle}>Lumo docs</span>
          <span style={badgeStyle}>Guide dashboard</span>
          <span style={badgeStyle}>HTML / PDF ready</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.05 }}>Guide library</h1>
        <p style={{ margin: '12px 0 0', maxWidth: 860, color: 'rgba(255,255,255,0.88)', fontSize: '1.02rem' }}>
          Open the live HTML handbook you need, then print to PDF if you want a shareable export. No scavenger hunt, no mystery meat docs.
        </p>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 20, marginTop: 22, alignItems: 'start' }}>
        <aside
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 24,
            padding: 20,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
            position: 'sticky',
            top: 18,
          }}
        >
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: '#7c3aed', marginBottom: 12 }}>
            Available guides
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {GUIDE_FILES.map((guide) => {
              const isActive = guide.htmlFile === activeGuide.htmlFile;
              return (
                <a
                  key={guide.htmlFile}
                  href={`/guide?doc=${encodeURIComponent(guide.htmlFile)}`}
                  style={{
                    textDecoration: 'none',
                    color: isActive ? '#1e1b4b' : '#0f172a',
                    background: isActive ? '#eef2ff' : '#f8fafc',
                    border: isActive ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                    borderRadius: 18,
                    padding: 16,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{guide.title}</div>
                  <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.5 }}>{guide.description}</div>
                </a>
              );
            })}
          </div>
        </aside>

        <section style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 24,
              padding: 20,
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: '#7c3aed', marginBottom: 10 }}>
              Active document
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0 }}>{activeGuide.title}</h2>
                <p style={{ margin: '8px 0 0', color: '#475569' }}>{activeGuide.description}</p>
              </div>
              <a
                href={`/guide?doc=${encodeURIComponent(activeGuide.htmlFile)}`}
                style={{
                  textDecoration: 'none',
                  padding: '12px 16px',
                  borderRadius: 999,
                  background: '#4f46e5',
                  color: 'white',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                This page is PDF-ready
              </a>
            </div>
          </div>

          <article
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: activeHtml }} />
          </article>
        </section>
      </section>
    </main>
  );
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 999,
  fontSize: '0.92rem',
  fontWeight: 700,
  background: 'rgba(255,255,255,0.12)',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.14)',
};
