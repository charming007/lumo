import type { ApiBaseSource } from '../lib/config';
import { describeCatalogState, describeRuntimeStatus } from '../lib/trust-copy';

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

  if (apiSource === 'missing-production-env') {
    return {
      background: '#7c2d12',
      detail: '#fed7aa',
    };
  }

  return {
    background: '#111827',
    detail: '#cbd5e1',
  };
}

function describeApiSource(apiSource: ApiBaseSource) {
  if (apiSource === 'missing-production-env') {
    return 'Production deploy is missing NEXT_PUBLIC_API_BASE_URL. The LMS now treats that as a hard blocker instead of quietly guessing a backend.';
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
  const catalogDetail = describeCatalogState(seedCount);
  if (catalogDetail) {
    return catalogDetail;
  }

  if (normalizedMode === 'offline' || normalizedMode === 'degraded') {
    return `Runtime mode is ${mode}. Reads may still be partially degraded even if the backend target is configured.`;
  }

  return null;
}

export function DemoBanner({ role, mode, seedCount = 0, apiSource = 'env' }: Props) {
  const tone = bannerTone(apiSource);
  const runtimeStatus = describeRuntimeStatus(mode, seedCount);
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
        <strong>Lumo operator shell</strong> — {runtimeStatus.label}
        {detail ? (
          <div style={{ marginTop: 4, fontSize: 13, color: tone.detail, lineHeight: 1.5 }}>
            {detail}
          </div>
        ) : null}
        <div style={{ marginTop: 4, fontSize: 13, color: tone.detail, lineHeight: 1.5 }}>
          {runtimeStatus.detail}
        </div>
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
