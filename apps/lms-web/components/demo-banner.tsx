import type { ApiBaseSource } from '../lib/config';

type Props = {
  role: string;
  mode: string;
  seedCount?: number;
  apiSource?: ApiBaseSource;
};

function bannerTone(apiSource: ApiBaseSource) {
  if (apiSource === 'invalid-production-env') {
    return {
      background: '#7c2d12',
      detail: '#fed7aa',
    };
  }

  if (apiSource === 'default-production-fallback') {
    return {
      background: '#1d4ed8',
      detail: '#dbeafe',
    };
  }

  return {
    background: '#111827',
    detail: '#cbd5e1',
  };
}

function describeApiSource(apiSource: ApiBaseSource) {
  if (apiSource === 'default-production-fallback') {
    return 'Backend is reaching the default Railway production host because NEXT_PUBLIC_API_BASE_URL is unset. That is live wiring, but it should still be an explicit deployment choice instead of mystery config.';
  }

  if (apiSource === 'invalid-production-env') {
    return 'Production deploy has an unsafe NEXT_PUBLIC_API_BASE_URL (placeholder, local-only, invalid, or non-HTTPS). The LMS now treats that as a hard blocker instead of pretending the backend wiring is fine.';
  }

  if (apiSource === 'local-fallback') {
    return 'Backend URL is using the local development fallback.';
  }

  return null;
}

function describeDataset(mode: string, seedCount: number) {
  const normalizedMode = mode.trim().toLowerCase();
  if (seedCount > 0) {
    return `Catalog is currently seeded (${seedCount} seeded pack${seedCount === 1 ? '' : 's'} visible). Treat that as sample content state, not proof that every operational metric is fake.`;
  }

  if (normalizedMode === 'offline' || normalizedMode === 'degraded') {
    return `Runtime mode is ${mode}. Reads may still be partially degraded even if the backend target is configured.`;
  }

  return null;
}

export function DemoBanner({ role, mode, seedCount = 0, apiSource = 'env' }: Props) {
  const tone = bannerTone(apiSource);
  const detail = describeApiSource(apiSource);
  const datasetDetail = describeDataset(mode, seedCount);

  return (
    <div
      style={{
        margin: '16px clamp(16px, 4vw, 32px) 0',
        background: tone.background,
        color: 'white',
        borderRadius: 18,
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        <strong>Lumo operator shell</strong> — runtime mode: {mode}
        {detail ? (
          <div style={{ marginTop: 4, fontSize: 13, color: tone.detail, lineHeight: 1.5 }}>
            {detail}
          </div>
        ) : null}
        {datasetDetail ? (
          <div style={{ marginTop: 4, fontSize: 13, color: tone.detail, lineHeight: 1.5 }}>
            {datasetDetail}
          </div>
        ) : null}
      </div>
      <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Current role: {role}</div>
    </div>
  );
}
