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
      background: '#fff5ed',
      border: '#fed7aa',
      title: '#9a3412',
      detail: '#9a5a1f',
    };
  }

  if (apiSource === 'missing-production-env') {
    return {
      background: '#fff5ed',
      border: '#fed7aa',
      title: '#9a3412',
      detail: '#9a5a1f',
    };
  }

  return {
    background: 'linear-gradient(135deg, #7468ff 0%, #8d7aff 58%, #b79dff 100%)',
    border: '#dcd7ff',
    title: '#ffffff',
    detail: '#f1efff',
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
        margin: '18px clamp(18px, 3vw, 32px) 0',
        background: tone.background,
        color: tone.title,
        borderRadius: 26,
        padding: '18px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        border: `1px solid ${tone.border}`,
        boxShadow: '0 20px 55px rgba(111, 99, 255, 0.16)',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        <strong style={{ color: tone.title }}>Lumo operator shell</strong> — {runtimeStatus.label}
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
      <div style={{ fontWeight: 850, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.22)', color: tone.title, border: '1px solid rgba(255,255,255,0.28)', borderRadius: 999, padding: '9px 12px' }}>Current role: {role}</div>
    </div>
  );
}
