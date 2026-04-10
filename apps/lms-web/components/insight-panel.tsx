import { Pill } from '../lib/ui';

export function InsightPanel({ headline, detail, metric }: { headline: string; detail: string; metric: string }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #6C63FF 0%, #8B7FFF 100%)',
        color: 'white',
        borderRadius: 28,
        padding: 28,
        minHeight: 240,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontSize: 13, opacity: 0.88, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Program insight</div>
        <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.15, marginBottom: 14 }}>{headline}</div>
        <div style={{ opacity: 0.92, lineHeight: 1.7, maxWidth: 560 }}>{detail}</div>
      </div>
      <div style={{ marginTop: 18 }}>
        <Pill label={metric} tone="rgba(255,255,255,0.16)" text="#ffffff" />
      </div>
    </div>
  );
}
