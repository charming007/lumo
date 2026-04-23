import { AppShell } from '../../components/shell';
import { getBuildSignature } from '../../lib/build-signature';

export default async function EnglishStudioPage() {
  const buildSignature = getBuildSignature();

  return (
    <AppShell seedCount={0} buildSignature={buildSignature}>
      <section style={{ display: 'grid', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.06)' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#6366f1', fontWeight: 800 }}>English Studio</div>
          <h1 style={{ margin: '10px 0 8px', fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05 }}>English reading and speaking lane</h1>
          <p style={{ margin: 0, color: '#475569', fontSize: 16, lineHeight: 1.7, maxWidth: 760 }}>
            Use this surface to manage English-specific content, speaking practice, lesson quality, and rollout readiness without being dumped back into the generic content library.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            ['Content queue', 'Curate English lessons, readers, prompts, and pronunciation packs for pod delivery.'],
            ['Practice tracking', 'Review speaking activity readiness, completion patterns, and follow-up support needs.'],
            ['Voice lane', 'Track English-specific narration, replay quality, and future voice improvements.'],
            ['Rollout status', 'Keep launch visibility on what is ready now versus what still needs polish.'],
          ].map(([title, copy]) => (
            <article key={title} style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{title}</h2>
              <p style={{ margin: '10px 0 0', color: '#475569', lineHeight: 1.6 }}>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
